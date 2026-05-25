// Auth Form Handler (Login, Registration, Admin Login)

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in, redirect accordingly
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const currentPath = window.location.pathname;

  if (token) {
    if (role === 'admin' && !currentPath.includes('admin-dashboard.html')) {
      window.location.href = '/admin-dashboard.html';
      return;
    } else if (role === 'user' && !currentPath.includes('dashboard.html') && !currentPath.includes('profile.html')) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  // LOGIN FORM
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        return showError('Please fill in all fields');
      }

      try {
        showLoading(true);
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (data && data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('username', data.username);
          localStorage.setItem('user', JSON.stringify({ _id: data._id, username: data.username, email: data.email }));

          Swal.fire({
            icon: 'success',
            title: 'Welcome Back!',
            text: 'Logged in successfully',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            window.location.href = '/dashboard.html';
          });
        }
      } catch (error) {
        showError(error.message || 'Login failed');
      } finally {
        showLoading(false);
      }
    });
  }

  // REGISTRATION FORM
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const isAdmin = document.getElementById('isAdminCheckbox')?.checked;
      const adminSecretKey = document.getElementById('adminSecretKey')?.value.trim();

      if (!username || !email || !password || !confirmPassword) {
        return showError('Please fill in all fields');
      }

      if (password !== confirmPassword) {
        return showError('Passwords do not match');
      }

      if (password.length < 6) {
        return showError('Password must be at least 6 characters');
      }

      const bodyData = { username, email, password };
      if (isAdmin && adminSecretKey) {
        bodyData.adminSecretKey = adminSecretKey;
      }

      try {
        showLoading(true);
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify(bodyData)
        });

        if (data && data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('username', data.username);
          localStorage.setItem('user', JSON.stringify({ _id: data._id, username: data.username, email: data.email }));

          const title = data.role === 'admin' ? 'Admin Registered!' : 'Registration Successful!';
          const redirectUrl = data.role === 'admin' ? '/admin-dashboard.html' : '/dashboard.html';

          Swal.fire({
            icon: 'success',
            title: title,
            text: 'Account created successfully',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            window.location.href = redirectUrl;
          });
        }
      } catch (error) {
        showError(error.message || 'Registration failed');
      } finally {
        showLoading(false);
      }
    });

    // Toggle Admin Secret Input visibility
    const isAdminCheckbox = document.getElementById('isAdminCheckbox');
    const adminSecretGroup = document.getElementById('adminSecretGroup');
    if (isAdminCheckbox && adminSecretGroup) {
      isAdminCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          adminSecretGroup.classList.remove('hidden');
        } else {
          adminSecretGroup.classList.add('hidden');
        }
      });
    }
  }

  // ADMIN LOGIN FORM
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        return showError('Please fill in all fields');
      }

      try {
        showLoading(true);
        const data = await apiFetch('/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (data && data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('username', data.username);
          localStorage.setItem('user', JSON.stringify({ _id: data._id, username: data.username, email: data.email }));

          Swal.fire({
            icon: 'success',
            title: 'Welcome System Admin',
            text: 'Logged in successfully',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            window.location.href = '/admin-dashboard.html';
          });
        }
      } catch (error) {
        showError(error.message || 'Access Denied: Admin check failed');
      } finally {
        showLoading(false);
      }
    });
  }
});

// Helper for UI alerts
function showError(msg) {
  Swal.fire({
    icon: 'error',
    title: 'Validation Error',
    text: msg
  });
  return false;
}

// Button loading state toggle
function showLoading(isLoading) {
  const submitBtn = document.querySelector('button[type="submit"]');
  if (submitBtn) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Processing...';
    } else {
      submitBtn.disabled = false;
      const icon = submitBtn.getAttribute('data-icon') || 'fa-sign-in-alt';
      const text = submitBtn.getAttribute('data-text') || 'Submit';
      submitBtn.innerHTML = `<i class="fas ${icon} mr-2"></i>${text}`;
    }
  }
}
