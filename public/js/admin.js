// Admin Dashboard Client Logic

let systemCategoryChart = null;
let usersStatusChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check authorization
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    localStorage.clear();
    window.location.href = '/admin-login.html';
    return;
  }

  // Display admin's name
  const username = localStorage.getItem('username');
  const adminGreetingEl = document.getElementById('adminGreeting');
  if (adminGreetingEl) adminGreetingEl.textContent = `Welcome, ${username} (System Admin)`;

  // Hook Logout Button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Initial Load of System Data
  await refreshAdminDashboard();
});

async function refreshAdminDashboard() {
  await fetchSystemStats();
  await fetchSystemUsers();
  await fetchSystemTransactions();
}

// Fetch general system statistics and render cards + charts
async function fetchSystemStats() {
  try {
    const data = await apiFetch('/admin/system-stats');
    if (data && data.success) {
      const s = data.stats;
      
      // Update Card Text
      document.getElementById('totalUsersCard').textContent = s.totalUsers;
      document.getElementById('totalTransactionsCard').textContent = s.totalTransactions;
      document.getElementById('totalVolumeCard').textContent = formatCurrency(s.totalIncomeVolume + s.totalExpenseVolume);
      document.getElementById('avgTxSizeCard').textContent = formatCurrency(s.avgTransactionSize);

      // Render charts
      renderSystemCategoryChart(s.categoryBreakdown);
      renderUsersStatusChart(s.activeUsers, s.inactiveUsers);
    }
  } catch (error) {
    console.error('Error fetching admin system stats:', error);
  }
}

// Fetch list of all system users
async function fetchSystemUsers() {
  try {
    const data = await apiFetch('/admin/users');
    if (data && data.success) {
      renderUsersTable(data.users);
    }
  } catch (error) {
    console.error('Error fetching system users:', error);
  }
}

// Render Users List Table
function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
          No registered users found.
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(user => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition';

    const isActive = user.status === 'active';
    const statusBadge = isActive 
      ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Active</span>'
      : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400">Deactivated</span>';

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
        ${user.username}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
        ${user.email}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
        ${statusBadge}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onclick="toggleUserStatus('${user._id}', '${user.username}')" 
          class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold text-xs uppercase tracking-wider"
        >
          ${isActive ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Toggle user status handler
async function toggleUserStatus(userId, name) {
  const result = await Swal.fire({
    title: 'Change Status?',
    text: `Are you sure you want to change the status of ${name}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, change status!'
  });

  if (result.isConfirmed) {
    try {
      const data = await apiFetch(`/admin/users/${userId}/status`, { method: 'PUT' });
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: data.message,
          timer: 1500,
          showConfirmButton: false
        });
        await refreshAdminDashboard();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Action Failed', text: error.message || 'Server error' });
    }
  }
}

// Fetch all system transactions
async function fetchSystemTransactions() {
  try {
    const data = await apiFetch('/admin/transactions');
    if (data && data.success) {
      renderSystemTransactionsTable(data.transactions);
    }
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
  }
}

// Render Master Ledger of transactions
function renderSystemTransactionsTable(transactions) {
  const tbody = document.getElementById('adminTransactionsTableBody');
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
          No transaction entries found across the system.
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
    
    const ownerName = tx.userId ? tx.userId.username : 'Deleted User';
    const ownerEmail = tx.userId ? tx.userId.email : '-';

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">
        ${formatDate(tx.date)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-slate-800 dark:text-white">${ownerName}</div>
        <div class="text-xs text-slate-400 dark:text-slate-500">${ownerEmail}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2 rounded text-xs font-semibold ${isIncome ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'}">
          ${tx.type.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white font-medium">
        ${tx.category}
      </td>
      <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
        ${tx.description || '-'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm ${amountClass}">
        ${amountPrefix}${formatCurrency(tx.amount)}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ---------------- ADMIN CHARTS ----------------

function renderSystemCategoryChart(breakdown) {
  const canvas = document.getElementById('systemCategoryChart');
  if (!canvas) return;

  const categories = Object.keys(breakdown);
  const values = Object.values(breakdown);

  if (categories.length === 0) {
    if (systemCategoryChart) systemCategoryChart.destroy();
    return;
  }

  const colors = {
    'Food': '#f97316', 'Travel': '#3b82f6', 'Shopping': '#a855f7', 
    'Bills': '#ef4444', 'Health': '#10b981', 'Education': '#6366f1', 
    'Orders': '#f59e0b', 'Other': '#64748b'
  };

  const chartColors = categories.map(cat => colors[cat] || '#8b5cf6');
  const isDark = document.documentElement.classList.contains('dark');
  const textClr = isDark ? '#cbd5e1' : '#334155';

  if (systemCategoryChart) {
    systemCategoryChart.data.labels = categories;
    systemCategoryChart.data.datasets[0].data = values;
    systemCategoryChart.data.datasets[0].backgroundColor = chartColors;
    systemCategoryChart.options.plugins.legend.labels.color = textClr;
    systemCategoryChart.update();
  } else {
    systemCategoryChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: categories,
        datasets: [{
          data: values,
          backgroundColor: chartColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Outfit', size: 11 }, color: textClr }
          }
        }
      }
    });
  }
}

function renderUsersStatusChart(active, inactive) {
  const canvas = document.getElementById('usersStatusChart');
  if (!canvas) return;

  const isDark = document.documentElement.classList.contains('dark');
  const textClr = isDark ? '#cbd5e1' : '#334155';

  if (usersStatusChart) {
    usersStatusChart.data.datasets[0].data = [active, inactive];
    usersStatusChart.options.plugins.legend.labels.color = textClr;
    usersStatusChart.update();
  } else {
    usersStatusChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Active Users', 'Deactivated'],
        datasets: [{
          data: [active, inactive],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Outfit', size: 12 }, color: textClr }
          }
        },
        cutout: '70%'
      }
    });
  }
}
