/* /// Deep Codex capture
/// Captured: 2026-10-02T20:10:09.098933+00:00
/// Capture: 1f262326afe312caa9d51514043e65d085c84f20527993720793f0ffa6744083
/// File: script.js
/// End capture */
/* ============================================
   CAT AGE CALCULATOR - VANILLA JAVASCRIPT
   ============================================ */

(function() {
  'use strict';

  // ----- DOM ELEMENTS -----
  const form = document.getElementById('cat-age-form');
  const catNameInput = document.getElementById('cat-name');
  const yearsInput = document.getElementById('cat-years');
  const monthsInput = document.getElementById('cat-months');
  const calculateBtn = document.getElementById('calculate-btn');
  const validationMessage = document.getElementById('validation-message');

  const resultSection = document.getElementById('result-section');
  const resultGreeting = document.getElementById('result-greeting');
  const humanAgeBig = document.getElementById('human-age-big');
  const catAgeComparison = document.getElementById('cat-age-comparison');
  const humanAgeComparison = document.getElementById('human-age-comparison');
  const resetBtn = document.getElementById('reset-btn');

  // ----- CONSTANTS -----
  const MAX_CAT_YEARS = 30;
  const MAX_CAT_MONTHS = 11;

  // ----- HELPER: VALIDATE & PARSE INPUTS -----
  function parseAndValidateInputs() {
    let yearsRaw = yearsInput.value.trim();
    let monthsRaw = monthsInput.value.trim();

    let years = yearsRaw === '' ? 0 : Number(yearsRaw);
    let months = monthsRaw === '' ? 0 : Number(monthsRaw);

    if (isNaN(years) || isNaN(months)) {
      showValidation('Please enter valid numbers for years and months.');
      return null;
    }

    if (years < 0 || months < 0) {
      showValidation('Age cannot be negative. Please enter a positive number.');
      return null;
    }

    if (months > MAX_CAT_MONTHS) {
      showValidation('Months should be between 0 and 11. For example, 13 months = 1 year and 1 month.');
      return null;
    }

    if (years > MAX_CAT_YEARS) {
      showValidation(`Cats rarely live beyond ${MAX_CAT_YEARS} years. Please enter a realistic age.`);
      return null;
    }

    if (years === MAX_CAT_YEARS && months > 0) {
      showValidation(`We use a maximum of ${MAX_CAT_YEARS} cat years. Please adjust the months or years.`);
      return null;
    }

    if (yearsRaw === '' && monthsRaw === '') {
      showValidation('Please enter your cat\'s age in years or months. 🐱');
      return null;
    }

    clearValidation();
    return { years, months };
  }

  function showValidation(message) {
    validationMessage.textContent = message;
    validationMessage.classList.add('show');
    resultSection.classList.add('hidden');
  }

  function clearValidation() {
    validationMessage.textContent = '';
    validationMessage.classList.remove('show');
  }

  // ----- CALCULATE HUMAN YEARS -----
  function calculateHumanYears(catYears, catMonths) {
    const totalYears = catYears + (catMonths / 12);

    if (totalYears <= 0) return 0;

    let humanYears = 0;

    if (totalYears <= 1) {
      humanYears = 15 * totalYears;
    } else if (totalYears <= 2) {
      humanYears = 15 + (totalYears - 1) * 9;
    } else {
      humanYears = 24 + (totalYears - 2) * 4;
    }

    return Math.round(humanYears);
  }

  // ----- FORMAT AGE STRING -----
  function formatAgeString(years, months) {
    const yearText = years === 1 ? '1 year' : `${years} years`;
    const monthText = months === 1 ? '1 month' : `${months} months`;

    if (years > 0 && months > 0) return `${yearText} ${monthText}`;
    if (years > 0) return yearText;
    return monthText;
  }

  // ----- UPDATE RESULT UI -----
  function displayResult(years, months, humanYears) {
    const name = catNameInput.value.trim();
    const displayName = name.length > 0 ? name : 'Your cat';

    const ageString = formatAgeString(years, months);
    resultGreeting.textContent = `${displayName} is ${ageString} old`;

    const humanYearsText = humanYears === 1 ? '1 Human Year' : `${humanYears} Human Years`;
    humanAgeBig.textContent = humanYearsText;

    catAgeComparison.textContent = ageString;
    humanAgeComparison.textContent = humanYears === 1 ? '1 Year' : `${humanYears} Years`;

    resultSection.classList.remove('hidden');

    const resultCard = document.querySelector('.result-card');
    if (resultCard) {
      resultCard.style.animation = 'none';
      void resultCard.offsetHeight;
      resultCard.style.animation = '';
    }

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleCalculate() {
    const inputs = parseAndValidateInputs();
    if (!inputs) return;
    const { years, months } = inputs;
    const humanYears = calculateHumanYears(years, months);
    displayResult(years, months, humanYears);
  }

  function handleReset() {
    form.reset();
    clearValidation();
    resultSection.classList.add('hidden');
    catNameInput.value = '';
    yearsInput.focus();
  }

  // ----- EVENT LISTENERS -----
  calculateBtn.addEventListener('click', handleCalculate);
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    handleCalculate();
  });
  resetBtn.addEventListener('click', handleReset);
  yearsInput.addEventListener('input', clearValidation);
  monthsInput.addEventListener('input', clearValidation);
  yearsInput.addEventListener('keydown', function(e) {
    if (e.key === '-' || e.key === 'e') e.preventDefault();
  });
  monthsInput.addEventListener('keydown', function(e) {
    if (e.key === '-' || e.key === 'e') e.preventDefault();
  });
  monthsInput.addEventListener('blur', function() {
    let val = parseInt(monthsInput.value, 10);
    if (isNaN(val) || val < 0) monthsInput.value = 0;
    else if (val > 11) monthsInput.value = 11;
  });
  yearsInput.addEventListener('blur', function() {
    let val = parseInt(yearsInput.value, 10);
    if (isNaN(val) || val < 0) yearsInput.value = 0;
    else if (val > 30) yearsInput.value = 30;
  });

  /* =========================================================
     THEME SYSTEM
     ========================================================= */

  const THEMES = [
    {
      id: 'original',
      name: 'Original',
      icon: '🎨',
      colors: ['#f0dbd0', '#ffffff', '#d46b4b']
    },
    {
      id: 'midnight',
      name: 'Midnight Cat',
      icon: '🌙',
      colors: ['#0c0b16', '#2a2548', '#a78bfa']
    },
    {
      id: 'ginger',
      name: 'Ginger Cat',
      icon: '🐈',
      colors: ['#ffe6c7', '#fffaf0', '#ef7f2c']
    },
    {
      id: 'tuxedo',
      name: 'Tuxedo Cat',
      icon: '🎩',
      colors: ['#ffffff', '#f4f4f5', '#111114']
    },
    {
      id: 'siamese',
      name: 'Siamese',
      icon: '💎',
      colors: ['#f7f0e0', '#fffdf8', '#6b4226']
    },
    {
      id: 'pastel',
      name: 'Pastel Paws',
      icon: '🌸',
      colors: ['#ffe7f2', '#e9e4ff', '#e78fc4']
    },
    {
      id: 'forest',
      name: 'Forest Cat',
      icon: '🌲',
      colors: ['#dfe8d6', '#fbfdf8', '#3f6b3a']
    },
    {
      id: 'neon',
      name: 'Neon Cat',
      icon: '⚡',
      colors: ['#05010c', '#1a0a30', '#00f0ff']
    }
  ];

  const STORAGE_KEY = 'catAgeTheme';
  const DEFAULT_THEME = 'original';

  const themeToggle = document.getElementById('theme-toggle');
  const themePanel = document.getElementById('theme-panel');
  const themeOptionsEl = document.getElementById('theme-options');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleLabel = document.getElementById('theme-toggle-label');

  function getThemeById(id) {
    return THEMES.find(t => t.id === id) || THEMES[0];
  }

  function applyTheme(id) {
    const theme = getThemeById(id);
    document.documentElement.setAttribute('data-theme', theme.id);
    updateToggleUI(theme);
    updateSelectedState(theme.id);
    try { localStorage.setItem(STORAGE_KEY, theme.id); } catch (e) { /* ignore */ }
  }

  function updateToggleUI(theme) {
    if (themeToggleIcon) themeToggleIcon.textContent = theme.icon;
    if (themeToggleLabel) themeToggleLabel.textContent = theme.name;
  }

  function updateSelectedState(currentId) {
    if (!themeOptionsEl) return;
    themeOptionsEl.querySelectorAll('.theme-option').forEach(btn => {
      const isCurrent = btn.dataset.themeId === currentId;
      btn.classList.toggle('selected', isCurrent);
      btn.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    });
  }

  function buildThemeOptions() {
    if (!themeOptionsEl) return;
    themeOptionsEl.innerHTML = '';

    THEMES.forEach(theme => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-option';
      btn.dataset.themeId = theme.id;
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', 'false');

      const swatch = document.createElement('span');
      swatch.className = 'theme-option-swatch';
      theme.colors.forEach(c => {
        const s = document.createElement('span');
        s.style.background = c;
        swatch.appendChild(s);
      });

      const label = document.createElement('span');
      label.className = 'theme-option-label';
      label.innerHTML = `<span aria-hidden="true">${theme.icon}</span> ${theme.name}`;

      const check = document.createElement('span');
      check.className = 'theme-option-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');

      btn.appendChild(swatch);
      btn.appendChild(label);
      btn.appendChild(check);

      btn.addEventListener('click', () => {
        applyTheme(theme.id);
        closePanel();
      });

      themeOptionsEl.appendChild(btn);
    });
  }

  function openPanel() {
    themePanel.hidden = false;
    // Force reflow then add class for animation
    void themePanel.offsetHeight;
    themePanel.classList.add('open');
    themeToggle.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    themePanel.classList.remove('open');
    themeToggle.setAttribute('aria-expanded', 'false');
    // Wait for transition before setting hidden to avoid layout jump
    setTimeout(() => {
      if (!themePanel.classList.contains('open')) themePanel.hidden = true;
    }, 220);
  }

  function togglePanel() {
    if (themePanel.hidden) openPanel();
    else closePanel();
  }

  // Initialize theme system
  function initThemeSystem() {
    buildThemeOptions();

    // Determine initial theme (already applied by inline head script, but keep consistent)
    let initial = DEFAULT_THEME;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES.some(t => t.id === saved)) initial = saved;
    } catch (e) { /* ignore */ }

    // Apply to ensure UI matches
    const theme = getThemeById(initial);
    document.documentElement.setAttribute('data-theme', theme.id);
    updateToggleUI(theme);
    updateSelectedState(theme.id);

    // Toggle button
    themeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!themePanel.hidden && !themePanel.contains(e.target) && e.target !== themeToggle && !themeToggle.contains(e.target)) {
        closePanel();
      }
    });

    // Escape closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !themePanel.hidden) {
        closePanel();
        themeToggle.focus();
      }
    });
  }

  // Kick off theme system
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSystem);
  } else {
    initThemeSystem();
  }

})();