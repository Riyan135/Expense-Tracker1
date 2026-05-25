// User Dashboard Client Logic

let monthlyCompareChart = null;
let categoryDoughnutChart = null;
let weeklyTrendsChart = null;
let allTransactionsList = [];
let editingTransactionId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check authorization
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'user') {
    localStorage.clear();
    window.location.href = '/login.html';
    return;
  }

  // Display user's name
  const username = localStorage.getItem('username');
  const userGreetingEl = document.getElementById('userGreeting');
  const userInitialsEl = document.getElementById('userInitials');
  if (userGreetingEl) userGreetingEl.textContent = `Hello, ${username}!`;
  if (userInitialsEl && username) {
    userInitialsEl.textContent = username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // Logout Button Hook
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Set default dates for filter inputs (Current Month)
  setDefaultDateFilters();

  // Load Dashboard Data & Charts
  await refreshDashboard();

  // Set event listeners for filters
  setupFilters();

  // Setup Form Submissions
  setupForms();
});

// Refresh all components in dashboard
async function refreshDashboard() {
  await fetchStats();
  await fetchTransactions();
  await fetchSavingsGoals();
}

// Fetch stats and render cards, progress bar, and charts
async function fetchStats() {
  try {
    const data = await apiFetch('/transactions/stats');
    if (data && data.success) {
      // 1. Update Cards
      document.getElementById('totalBalanceCard').textContent = formatCurrency(data.totals.remainingBalance);
      document.getElementById('totalIncomeCard').textContent = formatCurrency(data.totals.totalIncome);
      document.getElementById('totalExpenseCard').textContent = formatCurrency(data.totals.totalExpense);

      // Handle card color style adjustments if negative
      const balanceEl = document.getElementById('totalBalanceCard');
      if (data.totals.remainingBalance < 0) {
        balanceEl.className = 'text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1';
      } else {
        balanceEl.className = 'text-2xl font-bold text-slate-800 dark:text-white mt-1';
      }

      // 2. Budget Alert and Progress Bar
      const budgetAmount = data.currentMonth.budget;
      const spentAmount = data.currentMonth.expense;
      const budgetProgressSection = document.getElementById('budgetProgressSection');
      const budgetWarningAlert = document.getElementById('budgetWarningAlert');

      if (budgetAmount > 0) {
        budgetProgressSection.classList.remove('hidden');
        
        // Calculate progress percentage
        const progressPercentage = Math.min((spentAmount / budgetAmount) * 100, 100);
        const progressBar = document.getElementById('budgetProgressBar');
        const budgetProgressText = document.getElementById('budgetProgressText');
        
        progressBar.style.width = `${progressPercentage}%`;
        budgetProgressText.textContent = `${Math.round(progressPercentage)}% Spent (${formatCurrency(spentAmount)} of ${formatCurrency(budgetAmount)})`;

        // Progress bar coloring and warning alert
        if (progressPercentage >= 100) {
          progressBar.className = 'bg-rose-500 h-2.5 rounded-full transition-all duration-500';
          budgetWarningAlert.classList.remove('hidden');
          budgetWarningAlert.innerHTML = `
            <div class="flex items-center p-4 mb-4 text-sm text-rose-800 rounded-lg bg-rose-50 dark:bg-slate-900 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50" role="alert">
              <i class="fas fa-exclamation-triangle mr-3 text-lg"></i>
              <div>
                <span class="font-medium">Budget Exceeded!</span> You have spent <span class="font-semibold">${formatCurrency(spentAmount)}</span> which is higher than your monthly budget limit of <span class="font-semibold">${formatCurrency(budgetAmount)}</span>. Please plan your expenses!
              </div>
            </div>
          `;
        } else if (progressPercentage >= 80) {
          progressBar.className = 'bg-amber-500 h-2.5 rounded-full transition-all duration-500';
          budgetWarningAlert.classList.remove('hidden');
          budgetWarningAlert.innerHTML = `
            <div class="flex items-center p-4 mb-4 text-sm text-amber-800 rounded-lg bg-amber-50 dark:bg-slate-900 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50" role="alert">
              <i class="fas fa-exclamation-circle mr-3 text-lg"></i>
              <div>
                <span class="font-medium">Approaching Budget Limit!</span> You have spent <span class="font-semibold">${formatCurrency(spentAmount)}</span> which is <span class="font-semibold">${Math.round(progressPercentage)}%</span> of your monthly limit (${formatCurrency(budgetAmount)}).
              </div>
            </div>
          `;
        } else {
          progressBar.className = 'bg-indigo-600 dark:bg-violet-500 h-2.5 rounded-full transition-all duration-500';
          budgetWarningAlert.classList.add('hidden');
        }
      } else {
        budgetProgressSection.classList.add('hidden');
        budgetWarningAlert.classList.add('hidden');
      }

      // 3. Render/Update Charts
      renderCategoryChart(data.categoryBreakdown);
      renderMonthlyCompareChart(data.monthlyTrends);
      renderWeeklyTrendsChart(data.weeklyTrends);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Fetch transaction history and render the log list
async function fetchTransactions() {
  const type = document.getElementById('filterType').value;
  const category = document.getElementById('filterCategory').value;
  const search = document.getElementById('searchQuery').value.trim();
  const startDate = document.getElementById('filterStartDate').value;
  const endDate = document.getElementById('filterEndDate').value;

  // Build query string
  let queryStr = `?type=${type}&category=${category}`;
  if (search) queryStr += `&search=${encodeURIComponent(search)}`;
  if (startDate) queryStr += `&startDate=${startDate}`;
  if (endDate) queryStr += `&endDate=${endDate}`;

  try {
    const data = await apiFetch(`/transactions${queryStr}`);
    if (data && data.success) {
      allTransactionsList = data.transactions;
      renderTransactionsTable(data.transactions);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
}

// Render Transactions list in the HTML table
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transactionsTableBody');
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
          <div class="flex flex-col items-center justify-center space-y-2">
            <i class="fas fa-receipt text-3xl opacity-35"></i>
            <span>No transactions found. Add a new transaction or modify filters!</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  transactions.forEach((tx) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition';
    
    const isIncome = tx.type === 'income';
    const amountClass = isIncome ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold';
    const amountPrefix = isIncome ? '+' : '-';
    
    // Select category icon helper
    let iconClass = 'fa-tag';
    if (tx.category === 'Food') iconClass = 'fa-utensils text-orange-500';
    else if (tx.category === 'Travel') iconClass = 'fa-car text-blue-500';
    else if (tx.category === 'Shopping') iconClass = 'fa-shopping-bag text-purple-500';
    else if (tx.category === 'Bills') iconClass = 'fa-file-invoice-dollar text-red-500';
    else if (tx.category === 'Health') iconClass = 'fa-heartbeat text-emerald-500';
    else if (tx.category === 'Education') iconClass = 'fa-graduation-cap text-indigo-500';
    else if (tx.category === 'Orders') iconClass = 'fa-box text-amber-500';
    else if (tx.category === 'Salary') iconClass = 'fa-money-bill-wave text-green-500';
    else if (tx.category === 'Business') iconClass = 'fa-briefcase text-teal-500';
    else if (tx.category === 'Investment') iconClass = 'fa-chart-line text-cyan-500';
    else if (tx.category === 'Gifts') iconClass = 'fa-gift' + ' text-pink-500';

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">
        ${formatDate(tx.date)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIncome ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'}">
          <i class="fas ${isIncome ? 'fa-arrow-up mr-1' : 'fa-arrow-down mr-1'}"></i>
          ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 mr-2.5">
            <i class="fas ${iconClass}"></i>
          </div>
          <span>${tx.category}</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">
        ${tx.walletType || 'Cash'}
      </td>
      <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
        ${tx.description || '-'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm ${amountClass}">
        ${amountPrefix}${formatCurrency(tx.amount)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button onclick="openEditModal('${tx._id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="handleDeleteTransaction('${tx._id}')" class="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ---------------- CHART RENDERING LOGIC ----------------

function renderCategoryChart(breakdown) {
  const canvas = document.getElementById('categoryDoughnutChart');
  if (!canvas) return;

  const categories = Object.keys(breakdown);
  const values = Object.values(breakdown);

  // If no expense category data, display visual placeholder and clear chart
  if (categories.length === 0) {
    if (categoryDoughnutChart) categoryDoughnutChart.destroy();
    document.getElementById('noCategoryDataMsg').classList.remove('hidden');
    canvas.classList.add('hidden');
    return;
  }

  document.getElementById('noCategoryDataMsg').classList.add('hidden');
  canvas.classList.remove('hidden');

  const colors = {
    'Food': '#f97316',      // orange-500
    'Travel': '#3b82f6',    // blue-500
    'Shopping': '#a855f7',  // purple-500
    'Bills': '#ef4444',     // red-500
    'Health': '#10b981',    // emerald-500
    'Education': '#6366f1', // indigo-500
    'Orders': '#f59e0b',    // amber-500
    'Other': '#64748b'      // slate-500
  };

  const chartColors = categories.map(cat => colors[cat] || '#8b5cf6');
  const isDark = document.documentElement.classList.contains('dark');
  const textClr = isDark ? '#cbd5e1' : '#334155';

  if (categoryDoughnutChart) {
    categoryDoughnutChart.data.labels = categories;
    categoryDoughnutChart.data.datasets[0].data = values;
    categoryDoughnutChart.data.datasets[0].backgroundColor = chartColors;
    categoryDoughnutChart.options.plugins.legend.labels.color = textClr;
    categoryDoughnutChart.update();
  } else {
    categoryDoughnutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: values,
          backgroundColor: chartColors,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: 'Outfit', size: 12 },
              color: textClr
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ₹${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

function renderMonthlyCompareChart(trends) {
  const canvas = document.getElementById('monthlyCompareChart');
  if (!canvas) return;

  const labels = trends.map(t => t.label);
  const incomes = trends.map(t => t.income);
  const expenses = trends.map(t => t.expense);

  const isDark = document.documentElement.classList.contains('dark');
  const textClr = isDark ? '#cbd5e1' : '#334155';
  const gridClr = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (monthlyCompareChart) {
    monthlyCompareChart.data.labels = labels;
    monthlyCompareChart.data.datasets[0].data = incomes;
    monthlyCompareChart.data.datasets[1].data = expenses;
    monthlyCompareChart.options.scales.x.ticks.color = textClr;
    monthlyCompareChart.options.scales.y.ticks.color = textClr;
    monthlyCompareChart.options.scales.x.grid.color = gridClr;
    monthlyCompareChart.options.scales.y.grid.color = gridClr;
    monthlyCompareChart.options.plugins.legend.labels.color = textClr;
    monthlyCompareChart.update();
  } else {
    monthlyCompareChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomes,
            backgroundColor: 'rgba(16, 185, 129, 0.85)', // emerald
            borderRadius: 4
          },
          {
            label: 'Expense',
            data: expenses,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',  // rose
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Outfit', size: 12 }, color: textClr }
          }
        },
        scales: {
          x: {
            grid: { color: gridClr },
            ticks: { font: { family: 'Outfit' }, color: textClr }
          },
          y: {
            grid: { color: gridClr },
            ticks: {
              font: { family: 'Outfit' },
              color: textClr,
              callback: function(value) { return '₹' + value; }
            }
          }
        }
      }
    });
  }
}

function renderWeeklyTrendsChart(weekly) {
  const canvas = document.getElementById('weeklyTrendsChart');
  if (!canvas) return;

  const labels = weekly.map(w => w.label);
  const data = weekly.map(w => w.amount);

  const isDark = document.documentElement.classList.contains('dark');
  const textClr = isDark ? '#cbd5e1' : '#334155';
  const gridClr = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (weeklyTrendsChart) {
    weeklyTrendsChart.data.labels = labels;
    weeklyTrendsChart.data.datasets[0].data = data;
    weeklyTrendsChart.options.scales.x.ticks.color = textClr;
    weeklyTrendsChart.options.scales.y.ticks.color = textClr;
    weeklyTrendsChart.options.scales.x.grid.color = gridClr;
    weeklyTrendsChart.options.scales.y.grid.color = gridClr;
    weeklyTrendsChart.update();
  } else {
    weeklyTrendsChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Expenses',
          data: data,
          borderColor: '#8b5cf6', // violet-500
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#8b5cf6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: gridClr },
            ticks: { font: { family: 'Outfit' }, color: textClr }
          },
          y: {
            grid: { color: gridClr },
            ticks: {
              font: { family: 'Outfit' },
              color: textClr,
              callback: function(value) { return '₹' + value; }
            }
          }
        }
      }
    });
  }
}

// ---------------- DIALOG MODAL / FORM CONTROLLERS ----------------

function openAddModal() {
  editingTransactionId = null;
  document.getElementById('modalTitle').textContent = 'Add Transaction';
  document.getElementById('transactionForm').reset();
  
  // Set default date as today
  document.getElementById('txDate').value = formatDateForInput(new Date());
  
  // Reset receipt upload UI helper
  const receiptPlaceholder = document.getElementById('receiptPlaceholder');
  const receiptLoading = document.getElementById('receiptLoading');
  const receiptSuccess = document.getElementById('receiptSuccess');
  if (receiptPlaceholder) receiptPlaceholder.classList.remove('hidden');
  if (receiptLoading) receiptLoading.classList.add('hidden');
  if (receiptSuccess) receiptSuccess.classList.add('hidden');
  
  // Reset wallet selector default
  const txWallet = document.getElementById('txWallet');
  if (txWallet) txWallet.value = 'Cash';
  
  // Toggle categories selector depending on type
  toggleCategoryOptions('expense');
  
  document.getElementById('transactionModal').classList.remove('hidden');
}

function openEditModal(id) {
  editingTransactionId = id;
  const tx = allTransactionsList.find(t => t._id === id);
  if (!tx) return;

  document.getElementById('modalTitle').textContent = 'Edit Transaction';
  
  document.getElementById('txType').value = tx.type;
  toggleCategoryOptions(tx.type);
  
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txCategory').value = tx.category;
  document.getElementById('txDate').value = formatDateForInput(tx.date);
  document.getElementById('txDescription').value = tx.description || '';
  
  // Set wallet selector
  const txWallet = document.getElementById('txWallet');
  if (txWallet) txWallet.value = tx.walletType || 'Cash';
  
  // Reset receipt upload UI helper
  const receiptPlaceholder = document.getElementById('receiptPlaceholder');
  const receiptLoading = document.getElementById('receiptLoading');
  const receiptSuccess = document.getElementById('receiptSuccess');
  if (receiptPlaceholder) receiptPlaceholder.classList.remove('hidden');
  if (receiptLoading) receiptLoading.classList.add('hidden');
  if (receiptSuccess) receiptSuccess.classList.add('hidden');

  document.getElementById('transactionModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('transactionModal').classList.add('hidden');
  editingTransactionId = null;
}

// Categorized Select Box population based on Type (Income vs Expense)
function handleTypeChange(e) {
  toggleCategoryOptions(e.target.value);
}

function toggleCategoryOptions(type) {
  const categorySelect = document.getElementById('txCategory');
  categorySelect.innerHTML = '';

  const expenseCategories = ['Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Education', 'Orders', 'Other'];
  const incomeCategories = ['Salary', 'Business', 'Investment', 'Gifts', 'Other'];

  const selectedCategories = type === 'expense' ? expenseCategories : incomeCategories;

  selectedCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

function setupForms() {
  // Hook add button
  const addBtn = document.getElementById('addTransactionBtn');
  if (addBtn) addBtn.addEventListener('click', openAddModal);

  // Hook cancel/close buttons
  const closeBtns = document.querySelectorAll('.close-modal-btn');
  closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

  // Hook type change selector inside modal
  const txTypeSelect = document.getElementById('txType');
  if (txTypeSelect) txTypeSelect.addEventListener('change', handleTypeChange);

  // Modal Submit (Create / Edit)
  const transactionForm = document.getElementById('transactionForm');
  if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const type = document.getElementById('txType').value;
      const amount = Number(document.getElementById('txAmount').value);
      const category = document.getElementById('txCategory').value;
      const date = document.getElementById('txDate').value;
      const description = document.getElementById('txDescription').value.trim();
      const walletType = document.getElementById('txWallet').value;

      if (!amount || amount <= 0) {
        return Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a positive amount' });
      }
      if (!category) {
        return Swal.fire({ icon: 'warning', title: 'Required field', text: 'Please select a category' });
      }
      if (!date) {
        return Swal.fire({ icon: 'warning', title: 'Required field', text: 'Please select a date' });
      }

      const transactionPayload = { type, amount, category, date, description, walletType };

      try {
        let response;
        if (editingTransactionId) {
          // Update API
          response = await apiFetch(`/transactions/${editingTransactionId}`, {
            method: 'PUT',
            body: JSON.stringify(transactionPayload)
          });
        } else {
          // Create API
          response = await apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionPayload)
          });
        }

        if (response && response.success) {
          closeModal();
          Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: response.message || 'Transaction saved successfully',
            timer: 1500,
            showConfirmButton: false
          });
          
          await refreshDashboard();
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to save transaction' });
      }
    });
  }

  // Hook PDF Report Button
  const downloadReportBtn = document.getElementById('downloadReportBtn');
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', generatePDFReport);
  }

  // Hook Description change for auto category detection
  const txDescription = document.getElementById('txDescription');
  if (txDescription) {
    txDescription.addEventListener('input', (e) => {
      const desc = e.target.value.trim();
      const cat = detectCategoryFromDescription(desc);
      if (cat) {
        const categorySelect = document.getElementById('txCategory');
        if (categorySelect) {
          const options = Array.from(categorySelect.options).map(o => o.value);
          if (options.includes(cat)) {
            categorySelect.value = cat;
          }
        }
      }
    });
  }

  // Receipt OCR File Input Listener
  const receiptDropZone = document.getElementById('receiptDropZone');
  const receiptFileInput = document.getElementById('receiptFileInput');
  const receiptPlaceholder = document.getElementById('receiptPlaceholder');
  const receiptLoading = document.getElementById('receiptLoading');
  const receiptSuccess = document.getElementById('receiptSuccess');

  if (receiptDropZone && receiptFileInput) {
    receiptDropZone.addEventListener('click', () => {
      receiptFileInput.click();
    });

    receiptFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      receiptPlaceholder.classList.add('hidden');
      receiptSuccess.classList.add('hidden');
      receiptLoading.classList.remove('hidden');

      try {
        const result = await Tesseract.recognize(file, 'eng', {
          logger: m => console.log(m)
        });
        const text = result.data.text;
        
        const amount = parseAmountFromText(text);
        if (amount) {
          document.getElementById('txAmount').value = amount;
        }

        const dateVal = parseDateFromText(text);
        if (dateVal) {
          document.getElementById('txDate').value = dateVal;
        }

        const detected = autoDetectCategoryAndDescription(text);
        if (detected && detected.description) {
          document.getElementById('txDescription').value = detected.description;
          const cat = detectCategoryFromDescription(detected.description);
          if (cat) {
            const categorySelect = document.getElementById('txCategory');
            if (categorySelect) {
              const options = Array.from(categorySelect.options).map(o => o.value);
              if (options.includes(cat)) {
                categorySelect.value = cat;
              }
            }
          }
        }

        receiptLoading.classList.add('hidden');
        receiptSuccess.classList.remove('hidden');
      } catch (err) {
        console.error('OCR Error:', err);
        receiptLoading.classList.add('hidden');
        receiptPlaceholder.classList.remove('hidden');
        Swal.fire({ icon: 'error', title: 'OCR Scan Failed', text: 'Please ensure image is clear.' });
      }
    });
  }

  // Savings Goal Modal and Form Submit Hooks
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) addGoalBtn.addEventListener('click', openGoalAddModal);

  const closeGoalBtns = document.querySelectorAll('.close-goal-modal-btn');
  closeGoalBtns.forEach(btn => btn.addEventListener('click', closeGoalModal));

  const goalForm = document.getElementById('goalForm');
  if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('goalName').value.trim();
      const targetAmount = Number(document.getElementById('goalTarget').value);
      const savedAmount = Number(document.getElementById('goalSaved').value || 0);
      const deadline = document.getElementById('goalDeadline').value;

      if (!name || !targetAmount || targetAmount <= 0) {
        return Swal.fire({ icon: 'warning', title: 'Invalid inputs', text: 'Please fill name and a positive target amount' });
      }

      const payload = { name, targetAmount, savedAmount, deadline: deadline || undefined };

      try {
        let response;
        if (editingGoalId) {
          response = await apiFetch(`/users/goals/${editingGoalId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
        } else {
          response = await apiFetch('/users/goals', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }

        if (response && response.success) {
          closeGoalModal();
          Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: response.message || 'Savings goal saved successfully',
            timer: 1500,
            showConfirmButton: false
          });
          await fetchSavingsGoals();
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to save savings goal' });
      }
    });
  }
}

// Delete Transaction Hook
async function handleDeleteTransaction(id) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this transaction record!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      const data = await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: data.message || 'Transaction deleted successfully',
          timer: 1500,
          showConfirmButton: false
        });
        await refreshDashboard();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed to delete', text: error.message || 'Server error' });
    }
  }
}

// ---------------- FILTER ACTIONS ----------------

function setupFilters() {
  const filterType = document.getElementById('filterType');
  const filterCategory = document.getElementById('filterCategory');
  const searchQuery = document.getElementById('searchQuery');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  // Trigger search on inputs change
  filterType.addEventListener('change', fetchTransactions);
  filterCategory.addEventListener('change', fetchTransactions);
  filterStartDate.addEventListener('change', fetchTransactions);
  filterEndDate.addEventListener('change', fetchTransactions);
  
  // Debounce search query
  let timeout = null;
  searchQuery.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(fetchTransactions, 500);
  });

  // Reset Button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      filterType.value = 'all';
      filterCategory.value = 'all';
      searchQuery.value = '';
      setDefaultDateFilters();
      fetchTransactions();
    });
  }
}

function setDefaultDateFilters() {
  const start = new Date();
  // Set to 1st of current month
  start.setDate(1);
  const end = new Date();
  
  document.getElementById('filterStartDate').value = formatDateForInput(start);
  document.getElementById('filterEndDate').value = formatDateForInput(end);
}

// ---------------- PDF GENERATION UTILITY ----------------

function generatePDFReport() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    return Swal.fire({ icon: 'error', title: 'Library Error', text: 'PDF library was not loaded' });
  }

  const doc = new jsPDF();
  const username = localStorage.getItem('username') || 'User';

  // Title Banner
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, 210, 35, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('EXPENSE TRACKER FINANCIAL REPORT', 15, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 30);
  
  // User profile metadata
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFontSize(11);
  doc.text(`Prepared for: ${username}`, 15, 45);

  // Compute stats on current filtered list
  let totalIncome = 0;
  let totalExpense = 0;
  
  const pdfRows = allTransactionsList.map((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
    
    return [
      new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      tx.type.toUpperCase(),
      tx.category,
      tx.description || '-',
      `Rs. ${tx.amount.toFixed(2)}`
    ];
  });

  const netBalance = totalIncome - totalExpense;

  // Mini summary panel
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(15, 50, 180, 25, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(15, 50, 180, 25, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL INCOME', 25, 58);
  doc.text('TOTAL EXPENSE', 85, 58);
  doc.text('NET BALANCE', 145, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // green
  doc.text(`Rs. ${totalIncome.toFixed(2)}`, 25, 66);
  doc.setTextColor(239, 68, 68); // red
  doc.text(`Rs. ${totalExpense.toFixed(2)}`, 85, 66);
  
  if (netBalance >= 0) doc.setTextColor(16, 185, 129);
  else doc.setTextColor(239, 68, 68);
  doc.text(`Rs. ${netBalance.toFixed(2)}`, 145, 66);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Transaction Details Ledger', 15, 88);

  // Generate Table
  doc.autoTable({
    startY: 92,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: pdfRows,
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      4: { halign: 'right' }
    }
  });

  // Save the PDF
  doc.save(`Expense_Report_${formatDateForInput(new Date())}.pdf`);
  Swal.fire({
    icon: 'success',
    title: 'Downloaded!',
    text: 'Financial report PDF downloaded successfully',
    timer: 1500,
    showConfirmButton: false
  });
}

// Sidebar Tab Logic
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.tab-content');
  const openBtn = document.getElementById('openSidebarBtn');
  const closeBtn = document.getElementById('closeSidebarBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');

  const toggleSidebar = () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  };

  if (openBtn) openBtn.addEventListener('click', toggleSidebar);
  if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('data-target');
      
      // Remove active from all tabs & hide all sections
      tabs.forEach(t => t.classList.remove('active', 'bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-900/30', 'dark:text-indigo-400'));
      sections.forEach(s => s.classList.add('hidden'));
      
      // Add active to clicked tab & show target section
      tab.classList.add('active', 'bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-900/30', 'dark:text-indigo-400');
      document.getElementById(targetId).classList.remove('hidden');
      
      // Close sidebar on mobile
      if (window.innerWidth < 1024) toggleSidebar();
    });
  });

  // Attach sidebar Add/Download buttons
  const addBtnSide = document.getElementById('addTransactionBtnSidebar');
  const downBtnSide = document.getElementById('downloadReportBtnSidebar');
  const addBtnLedger = document.getElementById('addTransactionBtnLedger');
  
  // Clean up old ones first so they dont error
  const oldAdd = document.getElementById('addTransactionBtn');
  if(oldAdd) oldAdd.style.display = 'none';
  const oldDown = document.getElementById('downloadReportBtn');
  if(oldDown) oldDown.style.display = 'none';

  if(addBtnSide) addBtnSide.addEventListener('click', () => { window.openAddModal(); if(window.innerWidth < 1024) toggleSidebar(); });
  if(addBtnLedger) addBtnLedger.addEventListener('click', () => { window.openAddModal(); });
  if(downBtnSide) downBtnSide.addEventListener('click', () => { window.downloadReport(); if(window.innerWidth < 1024) toggleSidebar(); });
});

// Expose openEditModal and deletion / goal hooks globally
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.handleDeleteTransaction = handleDeleteTransaction;
window.downloadReport = generatePDFReport;

// Savings Goal CRUD Global Handlers
let editingGoalId = null;
let allGoalsList = [];

async function fetchSavingsGoals() {
  try {
    const data = await apiFetch('/users/goals');
    if (data && data.success) {
      allGoalsList = data.goals;
      renderSavingsGoals(data.goals);
    }
  } catch (error) {
    console.error('Error fetching savings goals:', error);
  }
}

function renderSavingsGoals(goals) {
  const container = document.getElementById('goalsContainer');
  if (!container) return;

  if (!goals || goals.length === 0) {
    container.innerHTML = `
      <div class="glass-panel p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center min-h-[160px] text-slate-400 dark:text-slate-500 col-span-full">
        <i class="fas fa-bullseye text-3xl mb-3 opacity-30"></i>
        <p class="text-sm">No savings goals yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  goals.forEach(goal => {
    const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const progressFormatted = Math.round(progress);
    
    let timeEstHtml = '';
    if (goal.deadline) {
      const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        timeEstHtml = `<span class="text-xs text-slate-500 dark:text-slate-400"><i class="far fa-clock mr-1"></i>${daysLeft} days left</span>`;
      } else if (daysLeft === 0) {
        timeEstHtml = `<span class="text-xs text-amber-500 font-semibold"><i class="far fa-clock mr-1"></i>Ends today</span>`;
      } else {
        timeEstHtml = `<span class="text-xs text-rose-500 font-semibold"><i class="far fa-clock mr-1"></i>Overdue</span>`;
      }
    } else {
      timeEstHtml = `<span class="text-xs text-slate-400">No target date</span>`;
    }

    const card = document.createElement('div');
    card.className = 'glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/30 flex flex-col justify-between space-y-4';
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <h4 class="text-base font-bold text-slate-900 dark:text-white">${goal.name}</h4>
          <p class="text-xs text-slate-500 mt-0.5">Target: ${formatCurrency(goal.targetAmount)}</p>
        </div>
        <div class="flex space-x-1">
          <button onclick="window.openGoalEditModal('${goal._id}')" class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i class="fas fa-edit text-xs"></i>
          </button>
          <button onclick="window.handleDeleteGoal('${goal._id}')" class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      </div>
      
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs font-semibold">
          <span class="text-slate-700 dark:text-slate-300">Saved: ${formatCurrency(goal.savedAmount)}</span>
          <span class="text-indigo-600 dark:text-indigo-400">${progressFormatted}%</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
        ${timeEstHtml}
        <button onclick="window.quickAddSavings('${goal._id}')" class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-xs font-bold transition flex items-center">
          <i class="fas fa-plus-circle mr-1"></i>Add Savings
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openGoalAddModal() {
  editingGoalId = null;
  document.getElementById('goalModalTitle').textContent = 'Add Savings Goal';
  document.getElementById('goalForm').reset();
  document.getElementById('goalModal').classList.remove('hidden');
}

function openGoalEditModal(id) {
  editingGoalId = id;
  const goal = allGoalsList.find(g => g._id === id);
  if (!goal) return;

  document.getElementById('goalModalTitle').textContent = 'Edit Savings Goal';
  document.getElementById('goalName').value = goal.name;
  document.getElementById('goalTarget').value = goal.targetAmount;
  document.getElementById('goalSaved').value = goal.savedAmount;
  document.getElementById('goalDeadline').value = goal.deadline ? formatDateForInput(goal.deadline) : '';

  document.getElementById('goalModal').classList.remove('hidden');
}

function closeGoalModal() {
  document.getElementById('goalModal').classList.add('hidden');
  editingGoalId = null;
}

async function handleDeleteGoal(id) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "Delete this savings goal?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      const data = await apiFetch(`/users/goals/${id}`, { method: 'DELETE' });
      if (data && data.success) {
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'Goal deleted successfully', timer: 1500, showConfirmButton: false });
        await fetchSavingsGoals();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to delete goal' });
    }
  }
}

async function quickAddSavings(id) {
  const goal = allGoalsList.find(g => g._id === id);
  if (!goal) return;

  const { value: amount } = await Swal.fire({
    title: 'Add Savings',
    text: `How much would you like to add to "${goal.name}"?`,
    input: 'number',
    inputPlaceholder: 'Amount in INR',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value || isNaN(value) || parseFloat(value) <= 0) {
        return 'Please enter a valid positive amount!';
      }
    }
  });

  if (amount) {
    try {
      const savedAmount = goal.savedAmount + parseFloat(amount);
      const data = await apiFetch(`/users/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ savedAmount })
      });
      if (data && data.success) {
        Swal.fire({ icon: 'success', title: 'Updated', text: 'Savings added successfully!', timer: 1500, showConfirmButton: false });
        await fetchSavingsGoals();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to add savings' });
    }
  }
}

// Global exposure for Savings Goals handlers
window.openGoalEditModal = openGoalEditModal;
window.handleDeleteGoal = handleDeleteGoal;
window.quickAddSavings = quickAddSavings;

// OCR Parser & auto category detection maps
const autoCategoryMap = {
  'dominos': 'Food',
  'pizza': 'Food',
  'mcdonald': 'Food',
  'kfc': 'Food',
  'starbucks': 'Food',
  'restaurant': 'Food',
  'cafe': 'Food',
  'burger': 'Food',
  'swiggy': 'Food',
  'zomato': 'Food',
  'dine': 'Food',
  'food': 'Food',
  'uber': 'Travel',
  'ola': 'Travel',
  'lyft': 'Travel',
  'cab': 'Travel',
  'taxi': 'Travel',
  'flight': 'Travel',
  'train': 'Travel',
  'metro': 'Travel',
  'irctc': 'Travel',
  'fuel': 'Travel',
  'petrol': 'Travel',
  'diesel': 'Travel',
  'walmart': 'Shopping',
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'myntra': 'Shopping',
  'target': 'Shopping',
  'groceries': 'Shopping',
  'supermarket': 'Shopping',
  'mall': 'Shopping',
  'clothing': 'Shopping',
  'store': 'Shopping',
  'electricity': 'Bills',
  'water': 'Bills',
  'internet': 'Bills',
  'wifi': 'Bills',
  'netflix': 'Bills',
  'spotify': 'Bills',
  'recharge': 'Bills',
  'mobile bill': 'Bills',
  'rent': 'Bills',
  'pharmacy': 'Health',
  'hospital': 'Health',
  'doctor': 'Health',
  'clinic': 'Health',
  'medicine': 'Health',
  'gym': 'Health',
  'udemy': 'Education',
  'coursera': 'Education',
  'tuition': 'Education',
  'book': 'Education',
  'school': 'Education',
  'college': 'Education',
  'salary': 'Salary',
  'bonus': 'Salary',
  'interest': 'Investment',
  'dividend': 'Investment',
  'stocks': 'Investment',
  'refund': 'Gifts',
  'cashback': 'Gifts'
};

function checkStoreKeywords(text) {
  const lowercase = text.toLowerCase();
  for (const keyword of Object.keys(autoCategoryMap)) {
    if (lowercase.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  return null;
}

function detectCategoryFromDescription(description) {
  if (!description) return null;
  const lowercase = description.toLowerCase();
  for (const [keyword, category] of Object.entries(autoCategoryMap)) {
    if (lowercase.includes(keyword)) {
      return category;
    }
  }
  return null;
}

function parseAmountFromText(text) {
  const regexes = [
    /(?:total|amt|amount|net|grand total|rs\.?|inr)\s*:?\s*(?:rs\.?|inr)?\s*([\d,]+\.\d{2})/i,
    /(?:total|amt|amount|net|grand total|rs\.?|inr)\s*:?\s*(?:rs\.?|inr)?\s*([\d,]+)/i,
    /([\d,]+\.\d{2})/
  ];

  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }
  }
  return null;
}

function parseDateFromText(text) {
  const dateRegex = /\b(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})\b/;
  const match = text.match(dateRegex);
  if (match) {
    let p1 = match[1];
    let p2 = match[2];
    let p3 = match[3];

    let year, month, day;
    if (p1.length === 4) {
      year = parseInt(p1);
      month = parseInt(p2);
      day = parseInt(p3);
    } else if (p3.length === 4) {
      year = parseInt(p3);
      month = parseInt(p2);
      day = parseInt(p1);
      if (month > 12 && day <= 12) {
        const temp = month;
        month = day;
        day = temp;
      }
    } else {
      year = 2000 + parseInt(p3);
      month = parseInt(p2);
      day = parseInt(p1);
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return formatDateForInput(new Date());
}

function autoDetectCategoryAndDescription(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length > 3) {
      const store = checkStoreKeywords(cleanLine);
      if (store) {
        return { description: store };
      }
    }
  }
  if (lines.length > 0 && lines[0].trim().length > 3) {
    return { description: lines[0].trim().substring(0, 50) };
  }
  return null;
}
