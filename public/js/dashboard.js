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
        <td colspan="5" class="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
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

      if (!amount || amount <= 0) {
        return Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a positive amount' });
      }
      if (!category) {
        return Swal.fire({ icon: 'warning', title: 'Required field', text: 'Please select a category' });
      }
      if (!date) {
        return Swal.fire({ icon: 'warning', title: 'Required field', text: 'Please select a date' });
      }

      const transactionPayload = { type, amount, category, date, description };

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
