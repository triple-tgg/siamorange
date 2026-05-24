document.addEventListener('DOMContentLoaded', () => {
  const pickerInput = document.getElementById('pickerInput');
  const pickerDropdown = document.getElementById('pickerDropdown');
  const prevYearBtn = document.getElementById('prevYear');
  const nextYearBtn = document.getElementById('nextYear');
  const currentYearSpan = document.getElementById('currentYear');
  const monthsGrid = document.getElementById('monthsGrid');

  if (!pickerInput || !pickerDropdown || !monthsGrid) return;

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  // Initialize with current date or saved date
  let selectedYear = parseInt(localStorage.getItem('selected_ranking_year')) || new Date().getFullYear();
  let selectedMonth = parseInt(localStorage.getItem('selected_ranking_month')) || (new Date().getMonth() + 1); // 1-12
  let displayYear = selectedYear;

  // Toggle dropdown
  pickerInput.addEventListener('click', (e) => {
    e.stopPropagation();
    pickerDropdown.classList.toggle('active');
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!pickerDropdown.contains(e.target) && e.target !== pickerInput) {
      pickerDropdown.classList.remove('active');
    }
  });

  // Year navigation
  if (prevYearBtn) {
    prevYearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      displayYear--;
      renderCalendar();
    });
  }

  if (nextYearBtn) {
    nextYearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      displayYear++;
      renderCalendar();
    });
  }

  function renderCalendar() {
    if (currentYearSpan) {
      currentYearSpan.textContent = displayYear + 543; // Buddhist Era display
    }
    monthsGrid.innerHTML = '';

    thaiShortMonths.forEach((monthName, index) => {
      const monthNum = index + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-button';
      if (displayYear === selectedYear && monthNum === selectedMonth) {
        btn.classList.add('selected');
      }
      btn.textContent = monthName;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedYear = displayYear;
        selectedMonth = monthNum;

        // Persist selection
        localStorage.setItem('selected_ranking_year', selectedYear);
        localStorage.setItem('selected_ranking_month', selectedMonth);

        // Update input field
        pickerInput.value = `${thaiMonths[selectedMonth - 1]} ${selectedYear + 543}`;

        // Close dropdown
        pickerDropdown.classList.remove('active');

        // Trigger report fetch with Thai Year (พ.ศ.)
        if (typeof getReport === 'function') {
          getReport(selectedYear + 543, selectedMonth);
        }
      });

      monthsGrid.appendChild(btn);
    });
  }

  // Initial render
  renderCalendar();

  // Set initial input value
  pickerInput.value = `${thaiMonths[selectedMonth - 1]} ${selectedYear + 543}`;

  // Auto-fetch report on load with Thai Year (พ.ศ.)
  if (typeof getReport === 'function') {
    getReport(selectedYear + 543, selectedMonth);
  }
});
