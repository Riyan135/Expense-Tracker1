// Profile management client side logic

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'user') {
    localStorage.clear();
    window.location.href = '/login.html';
    return;
  }

  // Set Username in header
  const profileUsernameEl = document.getElementById('profileUsername');
  const userInitialsEl = document.getElementById('userInitials');
  const username = localStorage.getItem('username');
  if (profileUsernameEl) profileUsernameEl.textContent = username;
  if (userInitialsEl && username) {
    userInitialsEl.textContent = username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // Load profile values from API
  try {
    const data = await apiFetch('/users/profile');
    if (data && data.success) {
      document.getElementById('usernameInput').value = data.user.username;
      document.getElementById('emailInput').value = data.user.email;
      document.getElementById('budgetInput').value = data.user.monthlyBudget;
      
      // Update local storage username if it changed
      localStorage.setItem('username', data.user.username);
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to load profile details'
    });
  }

  // Profile Details Form Submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usernameVal = document.getElementById('usernameInput').value.trim();
      const emailVal = document.getElementById('emailInput').value.trim();
      const budgetVal = Number(document.getElementById('budgetInput').value);

      if (!usernameVal || !emailVal) {
        return Swal.fire({ icon: 'warning', title: 'Empty fields', text: 'Name and Email are required' });
      }

      if (budgetVal < 0) {
        return Swal.fire({ icon: 'warning', title: 'Invalid Budget', text: 'Budget must be at least 0' });
      }

      try {
        const btn = profileForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Saving...';

        const result = await apiFetch('/users/profile', {
          method: 'PUT',
          body: JSON.stringify({
            username: usernameVal,
            email: emailVal,
            monthlyBudget: budgetVal
          })
        });

        if (result && result.success) {
          localStorage.setItem('username', result.user.username);
          if (profileUsernameEl) profileUsernameEl.textContent = result.user.username;
          if (userInitialsEl) {
            userInitialsEl.textContent = result.user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          }

          Swal.fire({
            icon: 'success',
            title: 'Profile Updated',
            text: result.message || 'Changes saved successfully',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Update Failed', text: error.message || 'Server error' });
      } finally {
        const btn = profileForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
      }
    });
  }

  // Password Change Form Submission
  const securityForm = document.getElementById('securityForm');
  if (securityForm) {
    securityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPasswordInput').value;
      const newPassword = document.getElementById('newPasswordInput').value;
      const confirmNewPassword = document.getElementById('confirmNewPasswordInput').value;

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return Swal.fire({ icon: 'warning', title: 'Empty fields', text: 'Please fill in all password fields' });
      }

      if (newPassword !== confirmNewPassword) {
        return Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'New passwords do not match' });
      }

      if (newPassword.length < 6) {
        return Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'New password must be at least 6 characters' });
      }

      try {
        const btn = securityForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Updating...';

        const result = await apiFetch('/users/change-password', {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (result && result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Password Updated',
            text: 'Your password has been changed successfully',
            timer: 1500,
            showConfirmButton: false
          });
          securityForm.reset();
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Failed', text: error.message || 'Server error' });
      } finally {
        const btn = securityForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key mr-2"></i>Update Password';
      }
    });
  }
});
