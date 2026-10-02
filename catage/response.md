I'll add a complete theme system to your existing Cat Age Calculator. Below are the three modified files (`index.html`, `style.css`, `script.js`). **The Original theme is preserved exactly** — all existing colors, shadows, fonts, and layout remain unchanged. Each new theme is a full visual identity via CSS custom properties.

---

### `index.html`

Adds a theme selector button + panel in the header, plus a tiny inline script at the top of `<head>` to apply the saved theme before paint (prevents flash).

```html
<!DOCTYPE html>
<html lang="en" data-theme="original">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>Cat Age Calculator · Human Years</title>

  <!-- Prevent flash of wrong theme: apply saved theme before CSS paints -->
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('catAgeTheme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);
      } catch (e) { /* ignore */ }
    })();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="style.css">
</head>
<body>

  <main class="app-wrapper">

    <!-- Header with theme selector -->
    <header class="app-header">
      <div class="header-top">
        <div class="logo-area">
          <span class="cat-emoji" aria-hidden="true">🐱</span>
          <h1>Cat Age Calculator</h1>
        </div>

        <!-- THEME SELECTOR -->
        <div class="theme-selector" id="theme-selector">
          <button
            type="button"
            class="theme-toggle"
            id="theme-toggle"
            aria-haspopup="true"
            aria-expanded="false"
            aria-controls="theme-panel"
            title="Choose a theme"
          >
            <span class="theme-toggle-icon" id="theme-toggle-icon">🎨</span>
            <span class="theme-toggle-label" id="theme-toggle-label">Original</span>
            <span class="theme-toggle-caret" aria-hidden="true">▾</span>
          </button>

          <div class="theme-panel" id="theme-panel" role="menu" aria-label="Theme options" hidden>
            <div class="theme-panel-header">Choose a theme</div>
            <div class="theme-options" id="theme-options"><!-- filled by JS --></div>
          </div>
        </div>
      </div>

      <p class="subtitle">Find out how old your cat is in human years</p>
    </header>

    <!-- Main calculator card -->
    <section class="calculator-card" aria-label="Cat age calculator">
      <form id="cat-age-form" novalidate>
        <div class="input-group">
          <label for="cat-name">Cat's Name <span class="optional">(optional)</span></label>
          <input type="text" id="cat-name" name="catName" placeholder="e.g. Milo, Luna, Oliver" autocomplete="off">
        </div>

        <div class="age-row">
          <div class="input-group half">
            <label for="cat-years">Years</label>
            <input type="number" id="cat-years" name="catYears" min="0" max="30" step="1" value="0" inputmode="numeric">
          </div>
          <div class="input-group half">
            <label for="cat-months">Months</label>
            <input type="number" id="cat-months" name="catMonths" min="0" max="11" step="1" value="0" inputmode="numeric">
          </div>
        </div>

        <button type="button" id="calculate-btn" class="btn-calculate">
          <span class="btn-icon">🐾</span> Calculate Age
        </button>

        <div id="validation-message" class="validation-message" role="alert"></div>
      </form>
    </section>

    <!-- Result area -->
    <section id="result-section" class="result-section hidden" aria-live="polite">
      <div class="result-card">
        <div class="result-header">
          <span class="result-cat-icon">🐱</span>
          <h2 id="result-greeting">Milo is 7 years old</h2>
        </div>

        <p class="result-label">That's approximately...</p>
        <div class="human-age-big" id="human-age-big">44 Human Years</div>

        <div class="comparison">
          <div class="comparison-item">
            <span class="comparison-label">Cat Age</span>
            <span class="comparison-value" id="cat-age-comparison">7 Years</span>
          </div>
          <div class="comparison-arrow">→</div>
          <div class="comparison-item">
            <span class="comparison-label">Human Age</span>
            <span class="comparison-value" id="human-age-comparison">44 Years</span>
          </div>
        </div>

        <button type="button" id="reset-btn" class="btn-reset">
          <span class="btn-icon">🔄</span> Calculate Again
        </button>
      </div>
    </section>
  </main>

  <footer class="app-footer">
    <p>🐈 Based on common veterinary guidelines: 1 year = 15 human years, 2 years = 24, then +4 per year.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
```

---

### `style.css`

Refactored to use CSS custom properties. The **Original theme** uses the exact same values as your existing site (so it looks identical). Each additional theme overrides the variables and adds small theme-specific touches.

```css
/* ---------- CSS RESET & GLOBAL ---------- */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* =========================================================
   THEME TOKENS
   All themes are driven by these variables.
   The "original" theme mirrors the current site 1:1.
   ========================================================= */
:root,
[data-theme="original"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-display: 'Quicksand', 'Segoe UI', system-ui, -apple-system, sans-serif;

  --bg: radial-gradient(circle at 20% 30%, #fff5f0, #f0dbd0 90%);
  --bg-solid: #f8e8e0;

  --card-bg: rgba(255, 255, 255, 0.85);
  --card-border: rgba(255, 255, 255, 0.9);
  --surface: rgba(255, 255, 255, 0.9);
  --surface-secondary: #fdf3ee;
  --surface-tertiary: #fff2ec;

  --text: #3a2e2a;
  --text-strong: #4d2e22;
  --text-muted: #7a6a64;
  --text-soft: #b19488;

  --accent: #d46b4b;
  --accent-strong: #b35438;
  --accent-soft: #f0b8a5;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #e07c5a, #c65a3a);
  --accent-gradient-text: linear-gradient(135deg, #6b3f2e, #b35438);
  --accent-shadow: #8f4129;

  --border: #f0ded4;
  --border-soft: #f7e2d8;
  --border-input: #edd6cc;

  --focus-ring: rgba(212, 107, 75, 0.12);
  --focus-border: #d46b4b;

  --shadow-card: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
  --shadow-card-hover: 0 30px 50px -15px rgba(150, 90, 70, 0.25);
  --shadow-btn: 0 12px 20px -8px rgba(200, 90, 60, 0.4);
  --shadow-btn-hover: 0 16px 24px -8px rgba(200, 90, 60, 0.5);

  --radius-card: 2.5rem;
  --radius-input: 1.5rem;

  --paw-deco: "🐾";
  --paw-opacity: 0.05;

  --theme-panel-bg: #ffffff;
  --theme-panel-border: #f0ded4;
  --theme-option-hover: #fdf3ee;
  --theme-option-selected: #ffe8df;
}

/* ---------- MIDNIGHT CAT ---------- */
[data-theme="midnight"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: radial-gradient(circle at 20% 20%, #1a1630, #0c0b16 70%);
  --bg-solid: #0c0b16;

  --card-bg: rgba(30, 27, 48, 0.75);
  --card-border: rgba(120, 110, 200, 0.25);
  --surface: rgba(36, 32, 58, 0.9);
  --surface-secondary: rgba(46, 40, 74, 0.85);
  --surface-tertiary: rgba(46, 40, 74, 0.6);

  --text: #e7e5f5;
  --text-strong: #ffffff;
  --text-muted: #a8a2c8;
  --text-soft: #7d78a0;

  --accent: #a78bfa;
  --accent-strong: #8b6cf0;
  --accent-soft: #6b5bb5;
  --accent-contrast: #0c0b16;
  --accent-gradient: linear-gradient(145deg, #a78bfa, #6f8bfa);
  --accent-gradient-text: linear-gradient(135deg, #c4b5fd, #93c5fd);
  --accent-shadow: #3a2f70;

  --border: rgba(140, 130, 210, 0.28);
  --border-soft: rgba(140, 130, 210, 0.18);
  --border-input: rgba(140, 130, 210, 0.3);

  --focus-ring: rgba(167, 139, 250, 0.25);
  --focus-border: #a78bfa;

  --shadow-card: 0 20px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px -20px rgba(167, 139, 250, 0.35);
  --shadow-card-hover: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 60px -18px rgba(167, 139, 250, 0.55);
  --shadow-btn: 0 12px 25px -8px rgba(139, 108, 240, 0.55), 0 0 30px -10px rgba(167, 139, 250, 0.6);
  --shadow-btn-hover: 0 16px 30px -8px rgba(139, 108, 240, 0.7), 0 0 40px -8px rgba(167, 139, 250, 0.75);

  --radius-card: 2.5rem;
  --radius-input: 1.5rem;

  --paw-deco: "🌙";
  --paw-opacity: 0.06;

  --theme-panel-bg: #1a1730;
  --theme-panel-border: rgba(140, 130, 210, 0.3);
  --theme-option-hover: rgba(120, 100, 220, 0.15);
  --theme-option-selected: rgba(120, 100, 220, 0.28);
}

/* ---------- GINGER CAT ---------- */
[data-theme="ginger"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: radial-gradient(circle at 25% 25%, #fff8ec, #ffe6c7 85%);
  --bg-solid: #fff2dd;

  --card-bg: rgba(255, 250, 240, 0.92);
  --card-border: rgba(255, 210, 160, 0.7);
  --surface: #fffaf0;
  --surface-secondary: #fff1d9;
  --surface-tertiary: #ffe9c9;

  --text: #4a3524;
  --text-strong: #3a2716;
  --text-muted: #8a6a4a;
  --text-soft: #b89873;

  --accent: #ef7f2c;
  --accent-strong: #d9660f;
  --accent-soft: #ffb673;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #f59240, #e26a10);
  --accent-gradient-text: linear-gradient(135deg, #b3540a, #ef7f2c);
  --accent-shadow: #a24e0a;

  --border: #ffd9a8;
  --border-soft: #ffe4bd;
  --border-input: #ffd9a8;

  --focus-ring: rgba(239, 127, 44, 0.18);
  --focus-border: #ef7f2c;

  --shadow-card: 0 20px 40px -12px rgba(200, 120, 40, 0.22);
  --shadow-card-hover: 0 30px 50px -15px rgba(200, 120, 40, 0.3);
  --shadow-btn: 0 12px 20px -8px rgba(220, 120, 40, 0.45), 0 4px 0 0 #a24e0a;
  --shadow-btn-hover: 0 16px 24px -8px rgba(220, 120, 40, 0.55), 0 4px 0 0 #a24e0a;

  --radius-card: 2.5rem;
  --radius-input: 1.5rem;

  --paw-deco: "🐾";
  --paw-opacity: 0.08;

  --theme-panel-bg: #fffaf0;
  --theme-panel-border: #ffd9a8;
  --theme-option-hover: #fff1d9;
  --theme-option-selected: #ffe1b8;
}

/* ---------- TUXEDO CAT ---------- */
[data-theme="tuxedo"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%);
  --bg-solid: #ffffff;

  --card-bg: #ffffff;
  --card-border: #e6e6e8;
  --surface: #ffffff;
  --surface-secondary: #f7f7f8;
  --surface-tertiary: #efeff1;

  --text: #1a1a1c;
  --text-strong: #000000;
  --text-muted: #555559;
  --text-soft: #8b8b90;

  --accent: #111114;
  --accent-strong: #000000;
  --accent-soft: #4a4a4f;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #2a2a2e, #0a0a0c);
  --accent-gradient-text: linear-gradient(135deg, #000000, #2a2a2e);
  --accent-shadow: #000000;

  --border: #e2e2e5;
  --border-soft: #ececef;
  --border-input: #dcdce0;

  --focus-ring: rgba(17, 17, 20, 0.12);
  --focus-border: #111114;

  --shadow-card: 0 20px 40px -18px rgba(0, 0, 0, 0.18);
  --shadow-card-hover: 0 30px 50px -18px rgba(0, 0, 0, 0.25);
  --shadow-btn: 0 12px 20px -10px rgba(0, 0, 0, 0.5), 0 4px 0 0 #000000;
  --shadow-btn-hover: 0 16px 26px -10px rgba(0, 0, 0, 0.6), 0 4px 0 0 #000000;

  --radius-card: 2rem;
  --radius-input: 1rem;

  --paw-deco: "";
  --paw-opacity: 0;

  --theme-panel-bg: #ffffff;
  --theme-panel-border: #e2e2e5;
  --theme-option-hover: #f7f7f8;
  --theme-option-selected: #ececef;
}

/* ---------- SIAMESE ---------- */
[data-theme="siamese"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Cormorant Garamond', 'Quicksand', serif;

  --bg: radial-gradient(circle at 30% 20%, #fbf6ec, #efe6d5 90%);
  --bg-solid: #f7f0e0;

  --card-bg: rgba(255, 252, 245, 0.92);
  --card-border: rgba(220, 200, 170, 0.6);
  --surface: #fffdf8;
  --surface-secondary: #f7eeda;
  --surface-tertiary: #f1e5cc;

  --text: #3a2c20;
  --text-strong: #2a1e14;
  --text-muted: #7a6650;
  --text-soft: #a89678;

  --accent: #6b4226;
  --accent-strong: #4d2e18;
  --accent-soft: #b08a68;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #8a5a38, #5c3618);
  --accent-gradient-text: linear-gradient(135deg, #6b4226, #8a5a38);
  --accent-shadow: #3a2210;

  --border: #e2d3b8;
  --border-soft: #ede0c8;
  --border-input: #ddcaad;

  --focus-ring: rgba(107, 66, 38, 0.15);
  --focus-border: #8a5a38;

  --shadow-card: 0 24px 48px -14px rgba(90, 60, 30, 0.2);
  --shadow-card-hover: 0 32px 56px -16px rgba(90, 60, 30, 0.28);
  --shadow-btn: 0 12px 22px -8px rgba(90, 55, 25, 0.45), 0 3px 0 0 #3a2210;
  --shadow-btn-hover: 0 16px 28px -8px rgba(90, 55, 25, 0.55), 0 3px 0 0 #3a2210;

  --radius-card: 2.75rem;
  --radius-input: 1.5rem;

  --paw-deco: "🐾";
  --paw-opacity: 0.05;

  --theme-panel-bg: #fffdf8;
  --theme-panel-border: #e2d3b8;
  --theme-option-hover: #f7eeda;
  --theme-option-selected: #ece0c6;
}

/* ---------- PASTEL PAWS ---------- */
[data-theme="pastel"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: linear-gradient(135deg, #ffe7f2 0%, #e9e4ff 45%, #dff0ff 100%);
  --bg-solid: #f3eaff;

  --card-bg: rgba(255, 255, 255, 0.85);
  --card-border: rgba(255, 255, 255, 0.9);
  --surface: #ffffff;
  --surface-secondary: #fbeffb;
  --surface-tertiary: #f1eaff;

  --text: #4a3b56;
  --text-strong: #3a2b46;
  --text-muted: #8274a0;
  --text-soft: #b4a4d0;

  --accent: #e78fc4;
  --accent-strong: #d16fae;
  --accent-soft: #f8c8e0;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #f0a4d0, #c88ce0);
  --accent-gradient-text: linear-gradient(135deg, #c86ec2, #8f9be8);
  --accent-shadow: #b06a9a;

  --border: #f0dcf0;
  --border-soft: #f5e6f5;
  --border-input: #ecd6ec;

  --focus-ring: rgba(231, 143, 196, 0.25);
  --focus-border: #e78fc4;

  --shadow-card: 0 20px 40px -12px rgba(180, 130, 210, 0.25);
  --shadow-card-hover: 0 30px 50px -15px rgba(180, 130, 210, 0.35);
  --shadow-btn: 0 12px 22px -8px rgba(210, 120, 190, 0.5), 0 4px 0 0 #b06a9a;
  --shadow-btn-hover: 0 16px 26px -8px rgba(210, 120, 190, 0.6), 0 4px 0 0 #b06a9a;

  --radius-card: 2.75rem;
  --radius-input: 1.75rem;

  --paw-deco: "🌸";
  --paw-opacity: 0.09;

  --theme-panel-bg: #ffffff;
  --theme-panel-border: #f0dcf0;
  --theme-option-hover: #fbeffb;
  --theme-option-selected: #f3ddf3;
}

/* ---------- FOREST CAT ---------- */
[data-theme="forest"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: radial-gradient(circle at 25% 25%, #eef4ea, #d5e0cd 90%);
  --bg-solid: #dfe8d6;

  --card-bg: rgba(250, 253, 246, 0.9);
  --card-border: rgba(180, 200, 160, 0.6);
  --surface: #fbfdf8;
  --surface-secondary: #eef4e6;
  --surface-tertiary: #e2ecd6;

  --text: #2a3a24;
  --text-strong: #1d2a17;
  --text-muted: #5c7050;
  --text-soft: #8fa382;

  --accent: #3f6b3a;
  --accent-strong: #2c5228;
  --accent-soft: #86a878;
  --accent-contrast: #ffffff;
  --accent-gradient: linear-gradient(145deg, #55874d, #335c2c);
  --accent-gradient-text: linear-gradient(135deg, #2c5228, #55874d);
  --accent-shadow: #1e3a1a;

  --border: #cfdcc2;
  --border-soft: #dde8d2;
  --border-input: #c8d8ba;

  --focus-ring: rgba(63, 107, 58, 0.18);
  --focus-border: #3f6b3a;

  --shadow-card: 0 20px 40px -12px rgba(60, 90, 50, 0.2);
  --shadow-card-hover: 0 30px 50px -15px rgba(60, 90, 50, 0.28);
  --shadow-btn: 0 12px 20px -8px rgba(50, 85, 45, 0.5), 0 4px 0 0 #1e3a1a;
  --shadow-btn-hover: 0 16px 24px -8px rgba(50, 85, 45, 0.6), 0 4px 0 0 #1e3a1a;

  --radius-card: 2.5rem;
  --radius-input: 1.5rem;

  --paw-deco: "🌿";
  --paw-opacity: 0.07;

  --theme-panel-bg: #fbfdf8;
  --theme-panel-border: #cfdcc2;
  --theme-option-hover: #eef4e6;
  --theme-option-selected: #dde8d2;
}

/* ---------- NEON CAT ---------- */
[data-theme="neon"] {
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Quicksand', sans-serif;

  --bg: radial-gradient(circle at 30% 20%, #150826, #05010c 75%);
  --bg-solid: #05010c;

  --card-bg: rgba(18, 8, 34, 0.85);
  --card-border: rgba(0, 240, 255, 0.3);
  --surface: rgba(22, 10, 42, 0.9);
  --surface-secondary: rgba(30, 14, 54, 0.85);
  --surface-tertiary: rgba(30, 14, 54, 0.6);

  --text: #e0f7ff;
  --text-strong: #ffffff;
  --text-muted: #8fbfd6;
  --text-soft: #6a8fa8;

  --accent: #00f0ff;
  --accent-strong: #ff2fd0;
  --accent-soft: #b56bff;
  --accent-contrast: #05010c;
  --accent-gradient: linear-gradient(145deg, #00f0ff, #b56bff 55%, #ff2fd0);
  --accent-gradient-text: linear-gradient(135deg, #00f0ff, #ff2fd0);
  --accent-shadow: #6b1e9e;

  --border: rgba(0, 240, 255, 0.28);
  --border-soft: rgba(0, 240, 255, 0.16);
  --border-input: rgba(0, 240, 255, 0.35);

  --focus-ring: rgba(0, 240, 255, 0.28);
  --focus-border: #00f0ff;

  --shadow-card: 0 20px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px -14px rgba(0, 240, 255, 0.5);
  --shadow-card-hover: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 55px -12px rgba(255, 47, 208, 0.6);
  --shadow-btn: 0 12px 25px -8px rgba(0, 240, 255, 0.7), 0 0 30px -8px rgba(181, 107, 255, 0.7);
  --shadow-btn-hover: 0 16px 30px -8px rgba(255, 47, 208, 0.8), 0 0 40px -8px rgba(0, 240, 255, 0.85);

  --radius-card: 2.5rem;
  --radius-input: 1.5rem;

  --paw-deco: "⚡";
  --paw-opacity: 0.07;

  --theme-panel-bg: #0e0520;
  --theme-panel-border: rgba(0, 240, 255, 0.35);
  --theme-option-hover: rgba(0, 240, 255, 0.08);
  --theme-option-selected: rgba(181, 107, 255, 0.22);
}

/* =========================================================
   BASE STYLES (unchanged layout — uses tokens)
   ========================================================= */
body {
  font-family: var(--font);
  background: var(--bg);
  background-attachment: fixed;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1.2rem 0.5rem;
  color: var(--text);
  line-height: 1.4;
  position: relative;
  transition: background 0.45s ease, color 0.35s ease;
}

/* Decorative background detail */
body::before {
  content: var(--paw-deco);
  position: fixed;
  top: 20px;
  left: 20px;
  font-size: 8rem;
  opacity: var(--paw-opacity);
  transform: rotate(-15deg);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.45s ease;
}

body::after {
  content: var(--paw-deco);
  position: fixed;
  bottom: 20px;
  right: 20px;
  font-size: 10rem;
  opacity: var(--paw-opacity);
  transform: rotate(20deg);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.45s ease;
}

/* Moon detail for Midnight theme */
[data-theme="midnight"] body::after {
  content: "🌙";
  opacity: 0.09;
}

[data-theme="neon"] body::before {
  content: "🌌";
  opacity: 0.08;
}

.app-wrapper {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
  z-index: 2;
}

/* ---------- HEADER ---------- */
.app-header {
  text-align: center;
  margin-bottom: 0.25rem;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  position: relative;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  flex: 1;
}

.cat-emoji {
  font-size: 3.2rem;
  line-height: 1;
  filter: drop-shadow(0 6px 8px rgba(196, 113, 80, 0.2));
  animation: gentle-wiggle 4s infinite ease-in-out;
  transition: filter 0.35s ease;
}

[data-theme="midnight"] .cat-emoji,
[data-theme="neon"] .cat-emoji {
  filter: drop-shadow(0 0 14px rgba(167, 139, 250, 0.6));
}

@keyframes gentle-wiggle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(8deg) scale(1.03); }
  75% { transform: rotate(-6deg) scale(0.98); }
}

h1 {
  font-family: var(--font-display);
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: var(--accent-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 12px rgba(180, 100, 70, 0.15);
  transition: background 0.35s ease;
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-top: 0.35rem;
  letter-spacing: 0.3px;
  transition: color 0.35s ease;
}

/* ---------- THEME SELECTOR ---------- */
.theme-selector {
  position: relative;
  flex-shrink: 0;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.9rem;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 2rem;
  color: var(--text);
  font-family: var(--font);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.15);
  transition: all 0.25s ease;
  white-space: nowrap;
}

.theme-toggle:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px -6px rgba(0, 0, 0, 0.2);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--focus-ring);
  border-color: var(--focus-border);
}

.theme-toggle-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.theme-toggle-label {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-toggle-caret {
  font-size: 0.75rem;
  opacity: 0.7;
  transition: transform 0.25s ease;
}

.theme-toggle[aria-expanded="true"] .theme-toggle-caret {
  transform: rotate(180deg);
}

/* Theme panel */
.theme-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: 280px;
  background: var(--theme-panel-bg);
  border: 2px solid var(--theme-panel-border);
  border-radius: 1.5rem;
  padding: 0.9rem;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.35);
  z-index: 50;
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
  transform-origin: top right;
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.theme-panel[hidden] { display: none; }

.theme-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.theme-panel-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 700;
  color: var(--text-soft);
  padding: 0.3rem 0.6rem 0.7rem;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 60vh;
  overflow-y: auto;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.7rem;
  border-radius: 0.9rem;
  border: 2px solid transparent;
  background: transparent;
  color: var(--text);
  font-family: var(--font);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  width: 100%;
}

.theme-option:hover {
  background: var(--theme-option-hover);
  transform: translateX(2px);
}

.theme-option.selected {
  background: var(--theme-option-selected);
  border-color: var(--accent);
}

.theme-option:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.theme-option-swatch {
  display: flex;
  flex-shrink: 0;
  width: 36px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.theme-option-swatch span {
  flex: 1;
  height: 100%;
}

.theme-option-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.theme-option-check {
  opacity: 0;
  font-size: 0.85rem;
  color: var(--accent);
  transition: opacity 0.15s ease;
}

.theme-option.selected .theme-option-check {
  opacity: 1;
}

/* ---------- CARD ---------- */
.calculator-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--radius-card);
  padding: 2.5rem 2rem 2rem;
  box-shadow: var(--shadow-card), 0 0 0 1px var(--card-border) inset;
  border: 1px solid var(--card-border);
  transition: transform 0.25s ease, box-shadow 0.35s ease, background 0.35s ease, border-color 0.35s ease;
}

.calculator-card:hover {
  box-shadow: var(--shadow-card-hover), 0 0 0 1px var(--card-border) inset;
}

/* ---------- FORM ELEMENTS ---------- */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.input-group label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-muted);
  padding-left: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.35s ease;
}

.optional {
  font-weight: 400;
  font-size: 0.8rem;
  color: var(--text-soft);
  letter-spacing: 0.2px;
}

input {
  font-family: var(--font);
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1rem 1.5rem;
  border-radius: var(--radius-input);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-strong);
  outline: none;
  transition: border 0.2s, box-shadow 0.2s, background 0.35s ease, color 0.35s ease;
  width: 100%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

input:focus {
  border-color: var(--focus-border);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

input::placeholder {
  color: var(--text-soft);
  font-weight: 400;
  font-size: 1.1rem;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.age-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.input-group.half {
  flex: 1;
  margin-bottom: 1rem;
}

/* ---------- BUTTONS ---------- */
.btn-calculate {
  width: 100%;
  margin-top: 1.2rem;
  padding: 1.2rem 2rem;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font);
  color: var(--accent-contrast);
  background: var(--accent-gradient);
  border: none;
  border-radius: 3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  box-shadow: var(--shadow-btn);
  transition: transform 0.1s ease, box-shadow 0.25s ease, filter 0.2s, background 0.35s ease, color 0.35s ease;
  letter-spacing: 0.3px;
}

.btn-calculate:hover {
  filter: brightness(1.05);
  box-shadow: var(--shadow-btn-hover);
  transform: translateY(-2px);
}

.btn-calculate:active {
  transform: translateY(3px);
}

.btn-calculate:focus-visible {
  outline: none;
  box-shadow: var(--shadow-btn), 0 0 0 4px var(--focus-ring);
}

.btn-icon {
  font-size: 1.7rem;
  line-height: 1;
}

.btn-reset {
  width: 100%;
  margin-top: 2rem;
  padding: 1rem 1.8rem;
  font-size: 1.2rem;
  font-weight: 600;
  font-family: var(--font);
  color: var(--text-strong);
  background: var(--surface-tertiary);
  border: 2px solid var(--border);
  border-radius: 3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease, background 0.35s ease, color 0.35s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.02);
}

.btn-reset:hover {
  background: var(--surface-secondary);
  border-color: var(--accent-soft);
  box-shadow: 0 8px 12px -6px rgba(150, 90, 70, 0.15);
  transform: translateY(-1px);
}

.btn-reset:active {
  transform: translateY(1px);
}

.btn-reset:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--focus-ring);
}

/* ---------- VALIDATION MESSAGE ---------- */
.validation-message {
  margin-top: 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #c0392b;
  background: #fdecea;
  padding: 0.75rem 1.2rem;
  border-radius: 2rem;
  text-align: center;
  border-left: 5px solid #c0392b;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

[data-theme="midnight"] .validation-message,
[data-theme="neon"] .validation-message {
  color: #ff8b9a;
  background: rgba(255, 80, 110, 0.12);
  border-left-color: #ff5c7a;
}

.validation-message.show {
  opacity: 1;
}

/* ---------- RESULT SECTION ---------- */
.result-section {
  transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.result-section.hidden {
  display: none;
}

.result-card {
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--radius-card);
  padding: 2.2rem 2rem 2rem;
  box-shadow: var(--shadow-card), 0 0 0 1px var(--card-border) inset;
  border: 1px solid var(--card-border);
  animation: revealUp 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards;
  transform-origin: top center;
  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}

@keyframes revealUp {
  0% { opacity: 0; transform: translateY(30px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.result-cat-icon {
  font-size: 2.5rem;
  line-height: 1;
  animation: pop 0.5s ease;
}

@keyframes pop {
  0% { transform: scale(0.5); opacity: 0; }
  80% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.result-header h2 {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: -0.3px;
  transition: color 0.35s ease;
}

.result-label {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
  font-weight: 500;
  transition: color 0.35s ease;
}

.human-age-big {
  font-family: var(--font-display);
  font-size: 4.8rem;
  font-weight: 800;
  line-height: 1.1;
  background: var(--accent-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
  margin: 0.3rem 0 0.5rem;
  filter: drop-shadow(0 6px 12px rgba(180, 90, 60, 0.2));
  word-break: break-word;
  transition: background 0.35s ease;
}

.comparison {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface-secondary);
  border-radius: 2.5rem;
  padding: 1.2rem 1.5rem;
  margin: 1.8rem 0 0.5rem;
  border: 2px solid var(--border-soft);
  gap: 0.5rem;
  flex-wrap: wrap;
  transition: background 0.35s ease, border-color 0.35s ease;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  min-width: 80px;
}

.comparison-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  color: var(--text-soft);
  transition: color 0.35s ease;
}

.comparison-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-strong);
  line-height: 1.2;
  transition: color 0.35s ease;
}

.comparison-arrow {
  font-size: 2.2rem;
  font-weight: 300;
  color: var(--accent-soft);
  padding: 0 0.2rem;
  line-height: 1;
  animation: nudge 1.5s infinite alternate ease-in-out;
  transition: color 0.35s ease;
}

@keyframes nudge {
  0% { transform: translateX(0); }
  100% { transform: translateX(6px); }
}

/* ---------- FOOTER ---------- */
.app-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-soft);
  padding: 1rem 0.5rem 0.5rem;
  border-top: 1px solid var(--border-soft);
  width: 100%;
  max-width: 680px;
  transition: color 0.35s ease, border-color 0.35s ease;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */
@media (max-width: 640px) {
  .header-top {
    flex-direction: column;
    gap: 0.8rem;
  }
  .logo-area { width: 100%; }
  .theme-selector { align-self: center; }
  .theme-panel { right: 50%; transform-origin: top center; }
  .theme-panel.open { transform: translateX(50%) translateY(0) scale(1); }
  .theme-panel:not(.open) { transform: translateX(50%) translateY(-8px) scale(0.97); }
}

@media (max-width: 550px) {
  body {
    padding: 1rem 0.9rem 0.3rem;
  }

  h1 {
    font-size: 2rem;
  }

  .cat-emoji {
    font-size: 2.6rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .calculator-card,
  .result-card {
    padding: 1.8rem 1.3rem 1.5rem;
    border-radius: 2rem;
  }

  .age-row {
    flex-direction: column;
    gap: 0;
  }

  .input-group.half {
    margin-bottom: 0.8rem;
  }

  input {
    padding: 0.9rem 1.2rem;
    font-size: 1.1rem;
  }

  .btn-calculate {
    font-size: 1.3rem;
    padding: 1rem 1.5rem;
  }

  .human-age-big {
    font-size: 3.2rem;
  }

  .result-header h2 {
    font-size: 1.4rem;
  }

  .comparison {
    padding: 1rem 0.8rem;
    border-radius: 1.8rem;
  }

  .comparison-value {
    font-size: 1.3rem;
  }

  .comparison-arrow {
    font-size: 1.6rem;
  }

  .comparison-label {
    font-size: 0.7rem;
  }

  .btn-reset {
    font-size: 1rem;
    padding: 0.9rem 1.2rem;
  }
}

@media (max-width: 380px) {
  .human-age-big {
    font-size: 2.6rem;
  }
  .result-header h2 {
    font-size: 1.2rem;
  }
  .comparison {
    flex-direction: column;
    gap: 0.5rem;
  }
  .comparison-arrow {
    transform: rotate(90deg);
    animation: none;
    padding: 0.2rem 0;
  }
  .theme-panel { width: 92vw; }
}
```

---

### `script.js`

Existing calculator logic is untouched. A new theme module has been added at the bottom. It builds the theme list, renders swatches, wires up the toggle, and persists the choice via `localStorage`.

```javascript
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
```

---

## Notes

- **Original theme preserved exactly** — its variable values mirror your existing colors, shadows, radii, and fonts 1:1.
- **No flash of wrong theme** — an inline script in `<head>` applies the saved `data-theme` before CSS paints.
- **Persistence** — `localStorage` key `catAgeTheme`; falls back to `original` if missing or invalid.
- **Instant switching** — themes swap via `data-theme` attribute + CSS custom properties, with smooth transitions on `background`, `color`, `box-shadow`, `border-color`.
- **Swatch previews** in the panel — each theme shows three real color chips, plus a ✓ for the active one.
- **Responsive** — on small screens the header stacks and the panel centers itself above the calculator; won't overlap inputs.
- **Accessibility** — `aria-expanded`, `aria-haspopup`, `role="menu"`, `role="menuitemradio"`, `aria-checked`, Escape-to-close, focus rings on all interactive controls, and click-outside-to-close.
- **All existing calculator features work unchanged** — validation, calculation, animation replay, reset, and event handling are untouched.