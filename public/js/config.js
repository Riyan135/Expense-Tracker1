// API Configuration & Helper Utilities

const API_BASE_URL = window.location.origin + '/api';

/**
 * Perform an authenticated API request with automatically injected JWT token.
 * Redirects to login if token is expired or invalid (401).
 * @param {string} endpoint - API path (e.g., '/auth/login', '/transactions')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Initialize headers if not set
  options.headers = options.headers || {};
  
  // Set default JSON Content-Type if not specified and sending body
  if (options.body && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  // Inject Authorization Header if token exists
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    // Parse response
    let data = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: response.ok, message: await response.text() };
    }

    if (!response.ok) {
      // Do not auto-logout on auth endpoints
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/admin/login') || endpoint.includes('/auth/register');

      // Auto logout on 401 Unauthorized or 403 Deactivated, but NOT during login
      if (response.status === 401 && !isAuthEndpoint) {
        logout();
        return;
      }
      
      if (response.status === 403 && !isAuthEndpoint && data.message && data.message.includes('deactivated')) {
        logout();
        Swal.fire({
          icon: 'error',
          title: 'Account Suspended',
          text: data.message || 'Your account has been deactivated.'
        });
        return;
      }

      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Log out user by clearing storage and redirecting.
 */
function logout() {
  const isAdmin = localStorage.getItem('role') === 'admin';
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  
  if (isAdmin) {
    window.location.href = '/admin-login.html';
  } else {
    window.location.href = '/login.html';
  }
}

/**
 * Format currency to USD/INR style
 * @param {number} amount 
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format Date to local readable string
 * @param {string|Date} dateString 
 */
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Parse date to standard input format (YYYY-MM-DD)
 * @param {string|Date} dateString 
 */
function formatDateForInput(dateString) {
  const d = new Date(dateString);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();

  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}
