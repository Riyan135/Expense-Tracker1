const fs = require('fs');

const logic = `
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
`;

let content = fs.readFileSync('public/js/dashboard.js', 'utf8');
content += logic;
fs.writeFileSync('public/js/dashboard.js', content);
