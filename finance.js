const STORAGE_KEY = 'financeTrackerState_enhanced_en';
let state = {
    bankBalance: 0,
    cashBalance: 0,
    incomes: [],
    expenses: [],
    lent: [],
    borrowed: []
};
let expenseChart = null; 

// --- Utility Functions ---

// Function to format currency using Indian Rupee sign
const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹ 0.00';
    // Use Intl.NumberFormat for proper Indian comma separation and decimal
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const loadState = () => {
    try {
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (storedState) {
            state = JSON.parse(storedState);
        }
    } catch (e) {
        console.error("Local storage load error:", e);
    }
};

const saveState = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderApp();
    } catch (e) {
        console.error("Local storage save error:", e);
    }
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Core Rendering Function ---

const renderApp = () => {
    renderDashboard();
    renderLists();
    renderCharts();
};

const renderDashboard = () => {
    const totalBalance = state.cashBalance + state.bankBalance;
    document.getElementById('totalBalanceDisplay').textContent = formatCurrency(totalBalance);
    document.getElementById('cashBalanceDisplay').textContent = formatCurrency(state.cashBalance);
    document.getElementById('bankBalanceDisplay').textContent = formatCurrency(state.bankBalance);

    const totalExpense = state.expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    document.getElementById('totalExpenseDisplay').textContent = formatCurrency(totalExpense);

    const totalLent = state.lent.filter(d => d.status === 'outstanding').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    document.getElementById('totalLentDisplay').textContent = formatCurrency(totalLent);

    const totalBorrowed = state.borrowed.filter(d => d.status === 'outstanding').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    document.getElementById('totalBorrowedDisplay').textContent = formatCurrency(totalBorrowed);

    // Set current balances in manual update form
    document.getElementById('initialCash').value = state.cashBalance.toFixed(2);
    document.getElementById('initialBank').value = state.bankBalance.toFixed(2);
};

// --- Chart Rendering Function ---
const renderCharts = () => {
    const expenseDataByCategory = state.expenses.reduce((acc, expense) => {
        const category = expense.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + parseFloat(expense.amount);
        return acc;
    }, {});

    const categories = Object.keys(expenseDataByCategory);
    const amounts = Object.values(expenseDataByCategory);

    const ctx = document.getElementById('expensePieChart').getContext('2d');
    const noDataEl = document.getElementById('noChartData');

    // Define colors for categories (ADDED 'Grocery')
    const categoryColors = {
        'Food & Drink': '#FF6384',
        'Grocery': '#34D399', // New color (Emerald/Mint Green)
        'Transport': '#36A2EB',
        'Bills & Rent': '#FFCE56',
        'Shopping': '#4BC0C0',
        'Entertainment': '#9966FF',
        'Health': '#FF9F40',
        'Academic & Study': '#8B5CF6', 
        'Other': '#C9CBCF',
        'Debt Repayment': '#7E22CE', 
        'Uncategorized': '#A0A0A0'
    };

    // Destroy old chart instance if it exists
    if (expenseChart) {
        expenseChart.destroy();
    }

    if (categories.length === 0) {
        noDataEl.classList.remove('hidden');
        document.getElementById('expensePieChart').style.display = 'none';
        return;
    }

    noDataEl.classList.add('hidden');
    document.getElementById('expensePieChart').style.display = 'block';

    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: categories.map(cat => categoryColors[cat] || categoryColors['Other']),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Inter',
                            size: 14
                        }
                    }
                },
                title: {
                    display: false,
                    text: 'Expense Breakdown by Category'
                }
            }
        }
    });
};

// --- List Rendering Function (UPDATED with Delete Buttons) ---
const renderLists = () => {
    // Helper for list item visual
    const listClasses = "p-3 rounded-lg flex justify-between items-center transition duration-200 hover:shadow-md border";

    // 1. Expense List
    const expenseList = document.getElementById('expenseList');
    expenseList.innerHTML = '';
    state.expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
        const icon = exp.sourceType === 'cash' ? 'ph-money' : 'ph-bank';
        // Display category in the list
        const categoryText = exp.category ? `<span class="text-xs text-indigo-500 font-semibold ml-2">(${exp.category})</span>` : '';

        expenseList.innerHTML += `
            <div class="${listClasses} border-rose-200 bg-white shadow-sm">
                <div class="flex items-center space-x-3">
                    <i class="${icon} text-rose-500 text-xl"></i>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">${exp.remark} ${categoryText}</p>
                        <p class="text-xs text-gray-500">${exp.location} | ${exp.date}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="font-bold text-rose-600 text-sm">- ${formatCurrency(exp.amount)}</span>
                    <button onclick="deleteTransaction('expenses', '${exp.id}')" class="text-gray-400 hover:text-rose-600 ml-3 transition p-1 rounded-full hover:bg-rose-50"><i class="ph-trash-simple text-lg"></i></button>
                </div>
            </div>
        `;
    });
    if (expenseList.innerHTML === '') expenseList.innerHTML = '<p class="text-sm text-gray-500 p-3">No expenses recorded yet.</p>';


    // 2. Income List
    const incomeList = document.getElementById('incomeList');
    incomeList.innerHTML = '';
    state.incomes.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inc => {
        // Use the new sourceType to determine the icon
        const icon = inc.sourceType === 'cash' ? 'ph-money' : 'ph-bank';
        const sourceTypeLabel = inc.sourceType === 'cash' ? 'Cash' : 'Bank/UPI';

        incomeList.innerHTML += `
            <div class="${listClasses} border-teal-200 bg-white shadow-sm">
                <div class="flex items-center space-x-3">
                    <i class="${icon} text-teal-500 text-xl"></i>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">${inc.remark}</p>
                        <p class="text-xs text-gray-500">${inc.source} | ${inc.date} (${sourceTypeLabel})</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="font-bold text-teal-600 text-sm">+ ${formatCurrency(inc.amount)}</span>
                    <button onclick="deleteTransaction('incomes', '${inc.id}')" class="text-gray-400 hover:text-rose-600 ml-3 transition p-1 rounded-full hover:bg-rose-50"><i class="ph-trash-simple text-lg"></i></button>
                </div>
            </div>
        `;
    });
    if (incomeList.innerHTML === '') incomeList.innerHTML = '<p class="text-sm text-gray-500 p-3">No income recorded yet.</p>';

    // 3. Lent List (Outstanding - Receivables)
    const lentList = document.getElementById('lentList');
    lentList.innerHTML = '';
    state.lent.filter(d => d.status === 'outstanding').sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(d => {
        lentList.innerHTML += `
            <div class="p-4 border-l-4 border-teal-500 bg-teal-50 rounded-lg flex justify-between items-center flex-wrap shadow-sm">
                <div class="mb-1 sm:mb-0">
                    <p class="font-semibold text-gray-800">${d.name} <span class="text-teal-600 font-bold ml-1 text-base">${formatCurrency(d.amount)}</span></p>
                    <p class="text-xs text-gray-600">${d.remark} (${d.date})</p>
                </div>
                <div class="flex space-x-2 mt-2 sm:mt-0">
                    <button onclick="showRepaymentModal('${d.id}')" class="bg-teal-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-teal-600 font-medium transition shadow-sm">Repaid</button>
                    <button onclick="deleteTransaction('lent', '${d.id}')" class="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-rose-600 font-medium transition shadow-sm">Delete</button>
                </div>
            </div>
        `;
    });
    if (lentList.innerHTML === '') lentList.innerHTML = '<p class="text-sm text-gray-500">All receivables have been settled.</p>';


    // 4. Borrowed List (Outstanding - Payables)
    const borrowedList = document.getElementById('borrowedList');
    borrowedList.innerHTML = '';
    state.borrowed.filter(d => d.status === 'outstanding').sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(d => {
        borrowedList.innerHTML += `
            <div class="p-4 border-l-4 border-rose-500 bg-rose-50 rounded-lg flex justify-between items-center flex-wrap shadow-sm">
                <div class="mb-1 sm:mb-0">
                    <p class="font-semibold text-gray-800">${d.name} <span class="text-rose-600 font-bold ml-1 text-base">${formatCurrency(d.amount)}</span></p>
                    <p class="text-xs text-gray-600">${d.remark} (${d.date})</p>
                </div>
                <div class="flex space-x-2 mt-2 sm:mt-0">
                    <button onclick="markBorrowedRepaid('${d.id}')" class="bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-indigo-600 font-medium transition shadow-sm">Repay</button>
                    <button onclick="deleteTransaction('borrowed', '${d.id}')" class="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-rose-600 font-medium transition shadow-sm">Delete</button>
                </div>
            </div>
        `;
    });
    if (borrowedList.innerHTML === '') borrowedList.innerHTML = '<p class="text-sm text-gray-500">All payables have been settled.</p>';
};


// --- DELETE TRANSACTION LOGIC ---
window.deleteTransaction = (listType, itemId) => { 
    const list = state[listType];

    if (!list || !Array.isArray(list)) {
        console.error(`Invalid list type: ${listType}`);
        showTemporaryMessage("Internal error: Invalid list type.", "error");
        return;
    }
    
    const item = list.find(i => i.id === itemId);
    if (!item) {
        showTemporaryMessage(`Item not found for deletion.`, "error");
        return;
    }

    const amount = parseFloat(item.amount);
    
    // 1. Reverse the effect on the balance
    switch (listType) {
        case 'incomes':
            // Income increased balance, so we subtract it.
            if (item.sourceType === 'cash') {
                state.cashBalance -= amount;
            } else {
                state.bankBalance -= amount;
            }
            break;

        case 'expenses':
            // Expense decreased balance, so we add it back.
            if (item.sourceType === 'cash') {
                state.cashBalance += amount;
            } else {
                state.bankBalance += amount;
            }
            break;

        case 'lent':
            // Lending money decreased cash (default assumption in creation), so we add it back.
            state.cashBalance += amount;
            break;

        case 'borrowed':
            // Borrowing money increased cash (default assumption in creation), so we subtract it.
            state.cashBalance -= amount;
            break;
    }

    // Apply safe rounding to balances to prevent floating point errors
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));
    
    // 2. Filter out the item from its list
    state[listType] = list.filter(i => i.id !== itemId);
    
    // 3. Save state and notify user
    saveState();
    showTemporaryMessage(`Record deleted and balances reversed successfully!`, "success");
};


// --- Form Handling Functions ---

document.getElementById('balanceUpdateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cash = parseFloat(document.getElementById('initialCash').value || 0);
    const bank = parseFloat(document.getElementById('initialBank').value || 0);

    if (isNaN(cash) || isNaN(bank) || cash < 0 || bank < 0) {
        showTemporaryMessage("Invalid balance amount entered.", "error");
        return;
    }

    state.cashBalance = cash;
    state.bankBalance = bank;
    saveState();
    showTemporaryMessage("Balances updated successfully!", "success");
});

document.getElementById('incomeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const date = document.getElementById('incomeDate').value;
    const sourceType = document.getElementById('incomeSourceType').value;
    const source = document.getElementById('incomeSource').value;
    const remark = document.getElementById('incomeRemark').value;

    if (amount <= 0 || isNaN(amount)) {
        showTemporaryMessage("Invalid income amount entered.", "error");
        return;
    }

    const newIncome = { id: generateId(), amount, date, source, remark, sourceType };
    state.incomes.push(newIncome);

    // Update balance based on sourceType
    if (sourceType === 'cash') {
        state.cashBalance += amount;
        showTemporaryMessage(`Income of ${formatCurrency(amount)} added to Cash.`, "success");
    } else { // bank
        state.bankBalance += amount;
        showTemporaryMessage(`Income of ${formatCurrency(amount)} added to Bank Balance.`, "success");
    }
    
    // Apply safe rounding to balances
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));

    saveState();
    e.target.reset();
    document.getElementById('incomeDate').valueAsDate = new Date();
});

document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const category = document.getElementById('expenseCategory').value;
    const location = document.getElementById('expenseLocation').value;
    const remark = document.getElementById('expenseRemark').value;
    const sourceType = document.getElementById('expenseSourceType').value;
    
    // Store original index before reset
    const originalCategoryIndex = document.getElementById('expenseCategory').selectedIndex;

    if (amount <= 0 || isNaN(amount)) {
        showTemporaryMessage("Invalid expense amount entered.", "error");
        return;
    }
     if (!category) {
        showTemporaryMessage("Please select an expense category.", "error");
        return;
    }

    if (sourceType === 'cash' && amount > state.cashBalance) {
        showTemporaryMessage("Insufficient Cash Balance!", "error");
        return;
    }
    if (sourceType === 'bank' && amount > state.bankBalance) {
        showTemporaryMessage("Insufficient Bank Balance!", "error");
        return;
    }

    const newExpense = { id: generateId(), amount, date, category, location, remark, sourceType };
    state.expenses.push(newExpense);

    if (sourceType === 'cash') {
        state.cashBalance -= amount;
    } else if (sourceType === 'bank') {
        state.bankBalance -= amount;
    }
    
    // Apply safe rounding to balances
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));

    saveState();
    
    // Reset form fields and set date/category back
    e.target.reset();
    document.getElementById('expenseDate').valueAsDate = new Date();
    // Re-select the category option since reset clears selection
    document.getElementById('expenseCategory').selectedIndex = originalCategoryIndex;

    // Show deduction in popup
    const sourceLabel = sourceType === 'cash' ? 'Cash' : 'Bank/UPI';
    showTemporaryMessage(`Expense of ${formatCurrency(amount)} deducted from ${sourceLabel}.`, "success");
});

document.getElementById('debtForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const debtType = document.getElementById('debtType').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const date = document.getElementById('debtDate').value;
    const name = document.getElementById('debtName').value;
    const remark = document.getElementById('debtRemark').value;

    if (amount <= 0 || isNaN(amount)) {
        showTemporaryMessage("Invalid debt amount entered.", "error");
        return;
    }

    const newDebt = { id: generateId(), amount, date, name, remark, status: 'outstanding' };

    if (debtType === 'lent') {
        // Lending money should come from an account. Defaulting to Cash for simplicity.
        if (amount > state.cashBalance) {
            showTemporaryMessage("Insufficient Cash to lend the amount!", "error");
            return;
        }
        state.cashBalance -= amount;
        state.lent.push(newDebt);
        showTemporaryMessage(`₹ ${formatCurrency(amount)} lent to ${name}. Cash deducted.`, "success");
    } else { // borrowed
        // Borrowed money goes into an account. Defaulting to Cash for simplicity.
        state.cashBalance += amount;
        state.borrowed.push(newDebt);
        showTemporaryMessage(`₹ ${formatCurrency(amount)} borrowed from ${name}. Cash added.`, "success");
    }

    // Apply safe rounding to balances
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));
    
    saveState();
    e.target.reset();
    document.getElementById('debtDate').valueAsDate = new Date();
});

// --- Debt Repayment Logic (Receivables - I am Owed) ---

let currentRepaymentId = null;

window.showRepaymentModal = (debtId) => { 
    currentRepaymentId = debtId;
    const debt = state.lent.find(d => d.id === debtId);
    if (!debt) return;

    document.getElementById('modalTitle').innerHTML = `<i class="ph-arrow-square-down-fill text-teal-500 mr-2"></i> Received Repayment from ${debt.name}`;
    document.getElementById('modalMessage').innerHTML = `Confirm receiving <span class="font-bold text-teal-600">${formatCurrency(debt.amount)}</span>. Which medium was it received in?`;

    document.getElementById('modalContent').innerHTML = `
        <select id="repaymentMethod" class="w-full p-3 border rounded-lg bg-gray-50">
            <option value="cash">Received Cash</option>
            <option value="bank">Received UPI/Bank Transfer</option>
        </select>
    `;

    document.getElementById('modalConfirm').textContent = "Confirm and Add to Balance";
    document.getElementById('modalConfirm').onclick = handleLentRepayment;
    document.getElementById('modalCancel').onclick = () => document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('hidden');
    document.querySelector('#modal > div').classList.remove('scale-95');
};

const handleLentRepayment = () => {
    const debt = state.lent.find(d => d.id === currentRepaymentId);
    const method = document.getElementById('repaymentMethod').value;
    const amount = parseFloat(debt.amount);

    if (method === 'cash') {
        state.cashBalance += amount;
    } else if (method === 'bank') {
        state.bankBalance += amount;
    }
    
    // Apply safe rounding to balances
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));

    debt.status = 'repaid';
    saveState();
    document.getElementById('modal').classList.add('hidden');
    showTemporaryMessage(`Repayment of ${formatCurrency(amount)} added to ${method === 'cash' ? 'Cash' : 'Bank'} balance!`, "success");
};

// --- Debt Repayment Logic (Payables - I Owe) ---

window.markBorrowedRepaid = (debtId) => { 
    const debt = state.borrowed.find(d => d.id === debtId);
    if (!debt) return;

    document.getElementById('modalTitle').innerHTML = `<i class="ph-arrow-square-up-fill text-rose-500 mr-2"></i> Repay Debt to ${debt.name}`;
    document.getElementById('modalMessage').innerHTML = `Confirm repayment of <span class="font-bold text-rose-600">${formatCurrency(debt.amount)}</span>. Which medium will you pay with? (This will also be recorded as an expense.)`;

    document.getElementById('modalContent').innerHTML = `
        <select id="repaymentExpenseMethod" class="w-full p-3 border rounded-lg bg-gray-50">
            <option value="cash">Pay with Cash</option>
            <option value="bank">Pay with Bank/UPI</option>
        </select>
    `;

    document.getElementById('modalConfirm').textContent = "Confirm Repayment and Deduct from Balance";
    document.getElementById('modalConfirm').onclick = () => handleBorrowedRepayment(debtId);
    document.getElementById('modalCancel').onclick = () => document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('hidden');
    document.querySelector('#modal > div').classList.remove('scale-95');
};

const handleBorrowedRepayment = (debtId) => {
    const debtIndex = state.borrowed.findIndex(d => d.id === debtId);
    const debt = state.borrowed[debtIndex];
    const method = document.getElementById('repaymentExpenseMethod').value;
    const amount = parseFloat(debt.amount);

    // Check balance
    const currentBalance = method === 'cash' ? state.cashBalance : state.bankBalance;
    if (amount > currentBalance) {
        document.getElementById('modal').classList.add('hidden');
        showTemporaryMessage(`Insufficient ${method === 'cash' ? 'Cash' : 'Bank'} Balance to repay the debt!`, "error");
        return;
    }

    // Deduct balance
    if (method === 'cash') {
        state.cashBalance -= amount;
    } else {
        state.bankBalance -= amount;
    }

    // Record as expense
     const repaymentExpense = {
        id: generateId(),
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category: "Debt Repayment", 
        location: debt.name,
        remark: `Debt Repayment to ${debt.name}`,
        sourceType: method
    };
    state.expenses.push(repaymentExpense);

    // Mark debt as repaid
    state.borrowed[debtIndex].status = 'repaid';

    // Apply safe rounding to balances
    state.cashBalance = parseFloat(state.cashBalance.toFixed(2));
    state.bankBalance = parseFloat(state.bankBalance.toFixed(2));
    
    saveState();
    document.getElementById('modal').classList.add('hidden');
    showTemporaryMessage(`Debt repaid and ${formatCurrency(amount)} deducted from ${method === 'cash' ? 'Cash' : 'Bank'}.`, "success");
}


// --- Temporary Message Function (Cool Snack Bar) ---
const showTemporaryMessage = (message, type) => {
    const container = document.getElementById('snackbar-container');
    const color = type === 'success' ? 'bg-teal-500 shadow-teal-300' : 'bg-rose-500 shadow-rose-300';
    const icon = type === 'success' ? '<i class="ph-check-circle-fill text-lg mr-2"></i>' : '<i class="ph-warning-circle-fill text-lg mr-2"></i>';

    const msgBox = document.createElement('div');
    msgBox.innerHTML = `${icon} ${message}`;
    msgBox.className = `p-3 rounded-xl text-white font-medium flex items-center shadow-lg transition-all transform duration-500 opacity-0 translate-y-4 ${color}`;

    container.appendChild(msgBox);

    // Animate in
    setTimeout(() => {
        msgBox.classList.remove('opacity-0', 'translate-y-4');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        msgBox.classList.add('opacity-0', 'translate-y-4');
        msgBox.addEventListener('transitionend', () => msgBox.remove());
    }, 3500);
};


// --- Initialization ---
const init = () => {
    loadState();
    // Set current date on date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incomeDate').value = today;
    document.getElementById('expenseDate').value = today;
    document.getElementById('debtDate').value = today;

    // Initialize select category to the first non-disabled option
    const expenseCategorySelect = document.getElementById('expenseCategory');
    // We now have 'Food & Drink' (index 1) and 'Grocery' (index 2) after the disabled option (index 0).
    // Let's set the default selection to the first actual category, 'Food & Drink'.
    if (expenseCategorySelect.options.length > 1) {
        expenseCategorySelect.selectedIndex = 1; 
    }

    renderApp();
};

window.onload = init;