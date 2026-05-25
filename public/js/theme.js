// Theme logic (Dark Mode toggle persistence)

(function () {
  // Check for saved theme preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  
  // Set initial icon states
  updateThemeIcons();

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
      updateThemeIcons();
    });
  });

  function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    themeToggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        if (isDark) {
          icon.className = 'fas fa-sun text-yellow-400';
        } else {
          icon.className = 'fas fa-moon text-slate-700 dark:text-slate-300';
        }
      }
    });
  }
});
