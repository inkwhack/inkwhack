Here is a complete, colorful HTML weight converter website. You can run this code directly in your browser.
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎨 Colourful Weight Converter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #f9d4e7 0%, #c3e6ff 50%, #b8f2d9 100%);
      padding: 1.5rem;
      animation: bgShift 18s infinite alternate ease-in-out;
    }

    @keyframes bgShift {
      0% { background: linear-gradient(145deg, #f9d4e7, #c3e6ff, #b8f2d9); }
      50% { background: linear-gradient(225deg, #ffe5b9, #d0bfff, #a7e0ff); }
      100% { background: linear-gradient(145deg, #ffc9de, #b0e0ff, #b3f0d6); }
    }

    .converter-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 3rem 1rem 3rem 1rem;
      box-shadow: 0 25px 40px -12px rgba(0, 0, 0, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.8);
      padding: 2.5rem 2rem;
      max-width: 600px;
      width: 100%;
      border: 3px solid rgba(255, 255, 255, 0.7);
      transition: all 0.3s ease;
    }

    h1 {
      font-size: 2.6rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-align: center;
      margin-bottom: 0.35rem;
      background: linear-gradient(135deg, #d43f8b, #4a6ef5, #10b981);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 4px 12px rgba(255, 255, 255, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    h1 span {
      font-size: 2.8rem;
    }

    .subhead {
      text-align: center;
      font-weight: 600;
      color: #3a3f5e;
      margin-bottom: 2rem;
      font-size: 1.1rem;
      background: rgba(255, 255, 255, 0.6);
      display: inline-block;
      padding: 0.4rem 1.8rem;
      border-radius: 40px;
      letter-spacing: 0.3px;
      box-shadow: inset 0 1px 6px rgba(255, 255, 255, 0.9), 0 6px 12px -6px #b0a9d4;
      backdrop-filter: blur(4px);
      margin-left: auto;
      margin-right: auto;
      width: fit-content;
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 1.8rem;
      margin-bottom: 2.5rem;
    }

    .input-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .input-group label {
      font-weight: 700;
      font-size: 1.2rem;
      color: #2a2e4a;
      background: rgba(255, 255, 255, 0.7);
      padding: 0.5rem 1rem;
      border-radius: 50px;
      box-shadow: inset 0 1px 5px white, 0 5px 10px -5px #b3a6d6;
      min-width: 110px;
      text-align: center;
      backdrop-filter: blur(2px);
    }

    .input-group input {
      flex: 2;
      min-width: 170px;
      padding: 1rem 1.5rem;
      font-size: 1.3rem;
      font-weight: 600;
      border: 3px solid rgba(255, 255, 255, 0.8);
      border-radius: 40px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(4px);
      color: #1d1f3b;
      outline: none;
      box-shadow: 0 8px 20px -8px #7f6fb0, inset 0 2px 6px white;
      transition: all 0.2s ease;
    }

    .input-group input:focus {
      border-color: #ff7eb6;
      box-shadow: 0 0 0 4px rgba(255, 126, 182, 0.4), 0 8px 20px -6px #5d4b9e;
      background: white;
      transform: scale(1.01);
    }

    .input-group select {
      padding: 1rem 1.8rem 1rem 1.5rem;
      font-size: 1.15rem;
      font-weight: 700;
      border: 3px solid rgba(255, 255, 255, 0.9);
      border-radius: 40px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      color: #272b4a;
      cursor: pointer;
      outline: none;
      box-shadow: 0 8px 18px -8px #896fb0, inset 0 2px 6px white;
      transition: all 0.2s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23d43f8b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1.2rem center;
      background-size: 1.3rem;
    }

    .input-group select:hover {
      background-color: #ffffff;
      border-color: #f7a1c4;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2.2rem;
    }

    .btn {
      border: none;
      font-weight: 800;
      font-size: 1.15rem;
      padding: 0.9rem 2rem;
      border-radius: 60px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      letter-spacing: 0.4px;
      transition: all 0.15s ease;
      box-shadow: 0 10px 18px -8px rgba(0, 0, 0, 0.3), inset 0 -2px 0 rgba(0, 0, 0, 0.1), inset 0 2px 10px white;
      border: 2px solid rgba(255, 255, 255, 0.7);
      background: linear-gradient(145deg, #ffffff, #f0eaff);
      color: #2e2a4b;
      flex: 1 0 auto;
      max-width: 200px;
      min-width: 130px;
    }

    .btn:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 18px 25px -12px #452e7a, inset 0 2px 12px white;
      background: linear-gradient(145deg, #ffffff, #f7edff);
    }

    .btn:active {
      transform: translateY(1px);
      box-shadow: 0 5px 12px -6px #392e5e;
    }

    .btn-primary {
      background: linear-gradient(145deg, #fea7d0, #ff8ab3);
      color: #1e1a2e;
      border: 2px solid #fff2f9;
      box-shadow: 0 12px 20px -10px #ca6fa0, inset 0 -2px 0 #b85e8b, inset 0 2px 12px #ffe3f0;
    }

    .btn-primary:hover {
      background: linear-gradient(145deg, #ffb8db, #ff9ec2);
    }

    .btn-secondary {
      background: linear-gradient(145deg, #b8e0ff, #9bc9ff);
      color: #1d1e3a;
      border: 2px solid #e3f0ff;
      box-shadow: 0 12px 20px -10px #5f7fc9, inset 0 -2px 0 #4b6cb0, inset 0 2px 12px #d6ebff;
    }

    .btn-secondary:hover {
      background: linear-gradient(145deg, #c2e6ff, #aed3ff);
    }

    .result-area {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      border-radius: 2.5rem 1rem 2.5rem 1rem;
      padding: 1.8rem 1.5rem;
      border: 3px solid rgba(255, 255, 255, 0.9);
      box-shadow: inset 0 2px 20px white, 0 18px 25px -12px #8371b0;
      transition: all 0.2s;
    }

    .result-area h2 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #31344f;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin-bottom: 1.2rem;
      border-bottom: 3px dashed #cbb3e6;
      padding-bottom: 0.6rem;
    }

    .result-area h2 span {
      font-size: 1.8rem;
    }

    .output-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.8rem;
    }

    .output-item {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(4px);
      border-radius: 24px;
      padding: 0.8rem 1.3rem;
      flex: 1 0 150px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 2px solid white;
      box-shadow: 0 8px 12px -8px #a48fc9, inset 0 2px 8px #f3ecff;
      transition: 0.1s;
    }

    .output-item:hover {
      background: #fffffff0;
      border-color: #ffb5d9;
    }

    .output-label {
      font-weight: 700;
      color: #4a3f6b;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .output-value {
      font-weight: 900;
      font-size: 1.35rem;
      background: linear-gradient(135deg, #c2417a, #3856b3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      letter-spacing: -0.2px;
      background-color: #ffffffd0;
      padding: 0.1rem 0.6rem;
      border-radius: 30px;
      text-shadow: 0 0 10px white;
    }

    .unit-tag {
      font-size: 0.8rem;
      background: #f0e2ff;
      padding: 0.2rem 0.6rem;
      border-radius: 30px;
      color: #483d6b;
      font-weight: 600;
    }

    .error-message {
      color: #d43f6b;
      font-weight: 700;
      background: #ffe2ed;
      padding: 0.7rem 1.5rem;
      border-radius: 50px;
      text-align: center;
      margin-top: 1rem;
      border: 2px solid #ffb3c9;
      backdrop-filter: blur(2px);
      display: none;
      font-size: 1rem;
    }

    .error-message.show {
      display: block;
    }

    @media (max-width: 500px) {
      .converter-card {
        padding: 1.8rem 1.2rem;
        border-radius: 2rem 0.5rem 2rem 0.5rem;
      }
      h1 { font-size: 2rem; }
      h1 span { font-size: 2.2rem; }
      .input-group label { min-width: 80px; font-size: 1rem; }
      .input-group input { font-size: 1.1rem; padding: 0.8rem 1rem; }
      .input-group select { padding: 0.8rem 1.5rem 0.8rem 1rem; }
      .btn { font-size: 1rem; padding: 0.7rem 1rem; min-width: 110px; }
      .output-value { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <div class="converter-card">
    <h1>
      <span>⚖️</span> Weight Converter <span>✨</span>
    </h1>
    <div class="subhead">
      🌈 colourful · quick · accurate
    </div>

    <!-- main input -->
    <div class="input-section">
      <div class="input-group">
        <label for="inputValue">⚡ Value</label>
        <input type="number" id="inputValue" value="1" step="any" placeholder="e.g. 2.5">
      </div>
      <div class="input-group">
        <label for="fromUnit">📌 From</label>
        <select id="fromUnit">
          <option value="kg" selected>Kilogram (kg)</option>
          <option value="g">Gram (g)</option>
          <option value="lb">Pound (lb)</option>
          <option value="oz">Ounce (oz)</option>
          <option value="st">Stone (st)</option>
        </select>
      </div>
      <div class="input-group">
        <label for="toUnit">🎯 To</label>
        <select id="toUnit">
          <option value="g">Gram (g)</option>
          <option value="kg">Kilogram (kg)</option>
          <option value="lb" selected>Pound (lb)</option>
          <option value="oz">Ounce (oz)</option>
          <option value="st">Stone (st)</option>
        </select>
      </div>
    </div>

    <!-- action buttons -->
    <div class="action-buttons">
      <button class="btn btn-primary" id="convertBtn">🔄 Convert</button>
      <button class="btn btn-secondary" id="resetBtn">♻️ Reset</button>
    </div>

    <!-- result area -->
    <div class="result-area">
      <h2>
        <span>📊</span> Result
      </h2>
      <div class="output-grid">
        <div class="output-item">
          <span class="output-label">🔹 Converted</span>
          <span class="output-value" id="resultValue">—</span>
        </div>
        <div class="output-item">
          <span class="output-label">🧾 Unit</span>
          <span class="output-value" id="resultUnit">—</span>
        </div>
      </div>
      <div id="errorMsg" class="error-message"></div>
    </div>
  </div>

  <script>
    (function() {
      // ----- DOM elements -----
      const inputValue = document.getElementById('inputValue');
      const fromUnit = document.getElementById('fromUnit');
      const toUnit = document.getElementById('toUnit');
      const convertBtn = document.getElementById('convertBtn');
      const resetBtn = document.getElementById('resetBtn');
      const resultValue = document.getElementById('resultValue');
      const resultUnit = document.getElementById('resultUnit');
      const errorMsg = document.getElementById('errorMsg');

      // ----- conversion factors to grams (base unit) -----
      const toGrams = {
        kg: 1000,
        g: 1,
        lb: 453.59237,
        oz: 28.349523125,
        st: 6350.29318   // 1 stone = 14 lb = 14 * 453.59237
      };

      // unit display names (short)
      const unitNames = {
        kg: 'kg',
        g: 'g',
        lb: 'lb',
        oz: 'oz',
        st: 'st'
      };

      // helper: show error with message
      function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        // hide error after 3 seconds
        setTimeout(() => {
          errorMsg.classList.remove('show');
        }, 3000);
      }

      // clear error
      function clearError() {
        errorMsg.classList.remove('show');
        errorMsg.textContent = '';
      }

      // ----- main conversion function -----
      function convert() {
        clearError();

        // read input value
        const rawValue = inputValue.value.trim();
        if (rawValue === '') {
          showError('✨ Please enter a value to convert.');
          resultValue.textContent = '—';
          resultUnit.textContent = '—';
          return;
        }

        const value = parseFloat(rawValue);
        if (isNaN(value) || !isFinite(value)) {
          showError('🔢 Please enter a valid number.');
          resultValue.textContent = '—';
          resultUnit.textContent = '—';
          return;
        }

        // get units
        const from = fromUnit.value;
        const to = toUnit.value;

        // convert: value -> grams -> target unit
        const grams = value * toGrams[from];
        const result = grams / toGrams[to];

        // round smartly: if very small or very large, use exponential? but we keep readable
        let displayResult;
        if (Math.abs(result) < 0.000001 && result !== 0) {
          displayResult = result.toExponential(6);
        } else if (Math.abs(result) >= 1e9) {
          displayResult = result.toExponential(6);
        } else {
          // round to 6 significant digits, then remove trailing zeros
          const rounded = parseFloat(result.toPrecision(8));
          displayResult = rounded.toString();
          // if it's an integer, show without decimals
        }

        // update result
        resultValue.textContent = displayResult;
        resultUnit.textContent = unitNames[to] + (to === 'st' ? ' (stone)' : '');
      }

      // ----- reset to defaults -----
      function reset() {
        inputValue.value = '1';
        fromUnit.value = 'kg';
        toUnit.value = 'lb';
        resultValue.textContent = '—';
        resultUnit.textContent = '—';
        clearError();
        // set a nice default result without clicking (optional: auto-convert 1kg to lb?)
        // we'll leave it as — for clarity, but user can press convert.
        // small micro interaction: set result to 2.20462 lb so it's not empty? but spec wants fresh reset.
        // I'll set it to 2.20462 lb because it's friendlier, but also show unit.
        // However, reset is meant to be clean. Let's keep as empty but show a subtle hint.
        // Better: set default conversion after reset: 1 kg = 2.20462 lb
        // But that might confuse. I'll keep it as '—' but we can do a tiny friendly touch:
        // After reset, set result to 2.20462 lb? That's inconsistent with '—'.
        // I'll set to "2.20462" and unit "lb" to make it feel alive.
        // Actually many converters show default. I'll go with that:
        resultValue.textContent = '2.20462';
        resultUnit.textContent = 'lb';
      }

      // ----- event listeners -----
      convertBtn.addEventListener('click', convert);

      resetBtn.addEventListener('click', reset);

      // allow Enter key in input field to trigger convert
      inputValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          convert();
        }
      });

      // auto-convert when units change? Many users like that. Let's do it only if value is not empty.
      // but we can convert automatically on unit change for better UX, but call convert if not empty.
      fromUnit.addEventListener('change', () => {
        if (inputValue.value.trim() !== '') convert();
      });
      toUnit.addEventListener('change', () => {
        if (inputValue.value.trim() !== '') convert();
      });

      // also convert when input changes? could be noisy, skip.

      // ----- initialize with a friendly default result -----
      // Set default values and run a conversion to show it's alive
      window.addEventListener('load', () => {
        // default: 1 kg -> lb  = 2.20462
        inputValue.value = '1';
        fromUnit.value = 'kg';
        toUnit.value = 'lb';
        // run convert to populate result
        convert();
      });

    })();
  </script>
</body>
</html>
```
### How the Weight Converter Works

This tool makes weight conversion simple and visual. You can enter a value, pick your units, and see the result instantly.

*   **Input & Unit Selection:** Enter any number in the "Value" field and choose your starting unit (like Kilogram or Pound) from the "From" dropdown. Then, select the unit you want to convert to from the "To" dropdown.
*   **Conversion & Feedback:** Click the **Convert** button or press Enter to see the result. The converted value and its unit appear in the colorful result panel. If you enter invalid data, a friendly error message pops up.
*   **Quick Actions:** Use the **Reset** button to return to the default values and see a sample conversion (1 kg to lb). The interface also automatically recalculates when you change units, as long as a value is entered.

---

Here is the updated HTML code for a colorful weight converter that converts automatically as you type or change units. No button clicks are needed.
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌈 Auto Colourful Weight Converter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #f9d4e7 0%, #c3e6ff 50%, #b8f2d9 100%);
      padding: 1.5rem;
      animation: bgShift 18s infinite alternate ease-in-out;
    }

    @keyframes bgShift {
      0% { background: linear-gradient(145deg, #f9d4e7, #c3e6ff, #b8f2d9); }
      50% { background: linear-gradient(225deg, #ffe5b9, #d0bfff, #a7e0ff); }
      100% { background: linear-gradient(145deg, #ffc9de, #b0e0ff, #b3f0d6); }
    }

    .converter-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 3rem 1rem 3rem 1rem;
      box-shadow: 0 25px 40px -12px rgba(0, 0, 0, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.8);
      padding: 2.5rem 2rem;
      max-width: 600px;
      width: 100%;
      border: 3px solid rgba(255, 255, 255, 0.7);
      transition: all 0.3s ease;
    }

    h1 {
      font-size: 2.6rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-align: center;
      margin-bottom: 0.35rem;
      background: linear-gradient(135deg, #d43f8b, #4a6ef5, #10b981);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 4px 12px rgba(255, 255, 255, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    h1 span {
      font-size: 2.8rem;
    }

    .subhead {
      text-align: center;
      font-weight: 600;
      color: #3a3f5e;
      margin-bottom: 2rem;
      font-size: 1.1rem;
      background: rgba(255, 255, 255, 0.6);
      display: inline-block;
      padding: 0.4rem 1.8rem;
      border-radius: 40px;
      letter-spacing: 0.3px;
      box-shadow: inset 0 1px 6px rgba(255, 255, 255, 0.9), 0 6px 12px -6px #b0a9d4;
      backdrop-filter: blur(4px);
      margin-left: auto;
      margin-right: auto;
      width: fit-content;
    }

    .input-section {
      display: flex;
      flex-direction: column;
      gap: 1.8rem;
      margin-bottom: 2rem;
    }

    .input-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .input-group label {
      font-weight: 700;
      font-size: 1.2rem;
      color: #2a2e4a;
      background: rgba(255, 255, 255, 0.7);
      padding: 0.5rem 1rem;
      border-radius: 50px;
      box-shadow: inset 0 1px 5px white, 0 5px 10px -5px #b3a6d6;
      min-width: 110px;
      text-align: center;
      backdrop-filter: blur(2px);
    }

    .input-group input {
      flex: 2;
      min-width: 170px;
      padding: 1rem 1.5rem;
      font-size: 1.3rem;
      font-weight: 600;
      border: 3px solid rgba(255, 255, 255, 0.8);
      border-radius: 40px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(4px);
      color: #1d1f3b;
      outline: none;
      box-shadow: 0 8px 20px -8px #7f6fb0, inset 0 2px 6px white;
      transition: all 0.2s ease;
    }

    .input-group input:focus {
      border-color: #ff7eb6;
      box-shadow: 0 0 0 4px rgba(255, 126, 182, 0.4), 0 8px 20px -6px #5d4b9e;
      background: white;
      transform: scale(1.01);
    }

    .input-group select {
      padding: 1rem 1.8rem 1rem 1.5rem;
      font-size: 1.15rem;
      font-weight: 700;
      border: 3px solid rgba(255, 255, 255, 0.9);
      border-radius: 40px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      color: #272b4a;
      cursor: pointer;
      outline: none;
      box-shadow: 0 8px 18px -8px #896fb0, inset 0 2px 6px white;
      transition: all 0.2s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23d43f8b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1.2rem center;
      background-size: 1.3rem;
    }

    .input-group select:hover {
      background-color: #ffffff;
      border-color: #f7a1c4;
    }

    /* live conversion badge */
    .live-badge {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      font-size: 0.95rem;
      color: #2f2b52;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(6px);
      padding: 0.5rem 1.5rem;
      border-radius: 40px;
      width: fit-content;
      margin: 0 auto 2rem auto;
      border: 2px dashed #b99ae0;
      box-shadow: 0 4px 12px -6px #b48fd6;
    }

    .live-badge .pulse {
      width: 12px;
      height: 12px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .result-area {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      border-radius: 2.5rem 1rem 2.5rem 1rem;
      padding: 1.8rem 1.5rem;
      border: 3px solid rgba(255, 255, 255, 0.9);
      box-shadow: inset 0 2px 20px white, 0 18px 25px -12px #8371b0;
      transition: all 0.2s;
    }

    .result-area h2 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #31344f;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin-bottom: 1.2rem;
      border-bottom: 3px dashed #cbb3e6;
      padding-bottom: 0.6rem;
    }

    .result-area h2 span {
      font-size: 1.8rem;
    }

    .output-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.8rem;
    }

    .output-item {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(4px);
      border-radius: 24px;
      padding: 0.8rem 1.3rem;
      flex: 1 0 150px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 2px solid white;
      box-shadow: 0 8px 12px -8px #a48fc9, inset 0 2px 8px #f3ecff;
      transition: 0.1s;
    }

    .output-item:hover {
      background: #fffffff0;
      border-color: #ffb5d9;
    }

    .output-label {
      font-weight: 700;
      color: #4a3f6b;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .output-value {
      font-weight: 900;
      font-size: 1.35rem;
      background: linear-gradient(135deg, #c2417a, #3856b3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      letter-spacing: -0.2px;
      background-color: #ffffffd0;
      padding: 0.1rem 0.6rem;
      border-radius: 30px;
      text-shadow: 0 0 10px white;
    }

    .unit-tag {
      font-size: 0.8rem;
      background: #f0e2ff;
      padding: 0.2rem 0.6rem;
      border-radius: 30px;
      color: #483d6b;
      font-weight: 600;
    }

    .error-message {
      color: #d43f6b;
      font-weight: 700;
      background: #ffe2ed;
      padding: 0.7rem 1.5rem;
      border-radius: 50px;
      text-align: center;
      margin-top: 1rem;
      border: 2px solid #ffb3c9;
      backdrop-filter: blur(2px);
      display: none;
      font-size: 1rem;
    }

    .error-message.show {
      display: block;
    }

    @media (max-width: 500px) {
      .converter-card {
        padding: 1.8rem 1.2rem;
        border-radius: 2rem 0.5rem 2rem 0.5rem;
      }
      h1 { font-size: 2rem; }
      h1 span { font-size: 2.2rem; }
      .input-group label { min-width: 80px; font-size: 1rem; }
      .input-group input { font-size: 1.1rem; padding: 0.8rem 1rem; }
      .input-group select { padding: 0.8rem 1.5rem 0.8rem 1rem; }
      .output-value { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <div class="converter-card">
    <h1>
      <span>⚖️</span> Auto Weight Converter <span>✨</span>
    </h1>
    <div class="subhead">
      🌈 converts as you type · no buttons needed
    </div>

    <!-- live indicator -->
    <div class="live-badge">
      <span class="pulse"></span> live auto-conversion
    </div>

    <!-- main input -->
    <div class="input-section">
      <div class="input-group">
        <label for="inputValue">⚡ Value</label>
        <input type="number" id="inputValue" value="1" step="any" placeholder="e.g. 2.5" autofocus>
      </div>
      <div class="input-group">
        <label for="fromUnit">📌 From</label>
        <select id="fromUnit">
          <option value="kg" selected>Kilogram (kg)</option>
          <option value="g">Gram (g)</option>
          <option value="lb">Pound (lb)</option>
          <option value="oz">Ounce (oz)</option>
          <option value="st">Stone (st)</option>
        </select>
      </div>
      <div class="input-group">
        <label for="toUnit">🎯 To</label>
        <select id="toUnit">
          <option value="g">Gram (g)</option>
          <option value="kg">Kilogram (kg)</option>
          <option value="lb" selected>Pound (lb)</option>
          <option value="oz">Ounce (oz)</option>
          <option value="st">Stone (st)</option>
        </select>
      </div>
    </div>

    <!-- result area -->
    <div class="result-area">
      <h2>
        <span>📊</span> Live Result
      </h2>
      <div class="output-grid">
        <div class="output-item">
          <span class="output-label">🔹 Converted</span>
          <span class="output-value" id="resultValue">2.20462</span>
        </div>
        <div class="output-item">
          <span class="output-label">🧾 Unit</span>
          <span class="output-value" id="resultUnit">lb</span>
        </div>
      </div>
      <div id="errorMsg" class="error-message"></div>
    </div>
  </div>

  <script>
    (function() {
      // ----- DOM elements -----
      const inputValue = document.getElementById('inputValue');
      const fromUnit = document.getElementById('fromUnit');
      const toUnit = document.getElementById('toUnit');
      const resultValue = document.getElementById('resultValue');
      const resultUnit = document.getElementById('resultUnit');
      const errorMsg = document.getElementById('errorMsg');

      // ----- conversion factors to grams (base unit) -----
      const toGrams = {
        kg: 1000,
        g: 1,
        lb: 453.59237,
        oz: 28.349523125,
        st: 6350.29318   // 1 stone = 14 lb = 14 * 453.59237
      };

      // unit display names (short)
      const unitNames = {
        kg: 'kg',
        g: 'g',
        lb: 'lb',
        oz: 'oz',
        st: 'st'
      };

      // helper: show error with message
      function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        // hide error after 3 seconds
        setTimeout(() => {
          errorMsg.classList.remove('show');
        }, 3000);
      }

      // clear error
      function clearError() {
        errorMsg.classList.remove('show');
        errorMsg.textContent = '';
      }

      // ----- auto conversion function (no buttons) -----
      function autoConvert() {
        clearError();

        // read input value
        const rawValue = inputValue.value.trim();

        // if empty, show placeholder and clear result
        if (rawValue === '') {
          resultValue.textContent = '—';
          resultUnit.textContent = '—';
          return;
        }

        const value = parseFloat(rawValue);
        if (isNaN(value) || !isFinite(value)) {
          showError('🔢 Please enter a valid number.');
          resultValue.textContent = '—';
          resultUnit.textContent = '—';
          return;
        }

        // get units
        const from = fromUnit.value;
        const to = toUnit.value;

        // convert: value -> grams -> target unit
        const grams = value * toGrams[from];
        const result = grams / toGrams[to];

        // format result: use exponential for very small/large numbers, else trim
        let displayResult;
        if (Math.abs(result) < 0.000001 && result !== 0) {
          displayResult = result.toExponential(6);
        } else if (Math.abs(result) >= 1e9) {
          displayResult = result.toExponential(6);
        } else {
          // round to 8 significant digits and remove trailing zeros
          const rounded = parseFloat(result.toPrecision(8));
          displayResult = rounded.toString();
        }

        // update result
        resultValue.textContent = displayResult;
        resultUnit.textContent = unitNames[to] + (to === 'st' ? ' (stone)' : '');
      }

      // ----- attach event listeners for auto conversion -----
      // 1. input on value field (fires on every keystroke, paste, etc.)
      inputValue.addEventListener('input', autoConvert);

      // 2. change events on both dropdowns
      fromUnit.addEventListener('change', autoConvert);
      toUnit.addEventListener('change', autoConvert);

      // 3. just in case, also listen for 'change' on input (e.g. up/down arrows)
      inputValue.addEventListener('change', autoConvert);

      // ----- initialize with a friendly default (already 1 kg -> lb) -----
      // The HTML shows default result 2.20462 lb, but call autoConvert to sync after load
      window.addEventListener('load', () => {
        // tiny delay to ensure all elements ready
        setTimeout(() => {
          autoConvert();  // will recalculate 1 kg to lb (should be 2.20462)
        }, 10);
      });

      // also run immediately in case load already fired
      autoConvert();
    })();
  </script>
</body>
</html>
```
### Live Conversion Mechanics

The page is built to give you instant feedback. Every change you make updates the result immediately.

*   **Real-Time Updates:** The conversion happens automatically whenever you **type a number** in the value field or **change either unit dropdown**. There's a subtle "live auto-conversion" indicator with a pulsing dot to remind you it's active.
*   **Smart Formatting:** The result is formatted for readability. Very large or very small numbers are shown in scientific notation, while normal numbers are rounded to a sensible number of significant digits.
*   **Input Handling:** If you clear the value field, the result area shows a dash. If you enter something that isn't a number, a friendly error message appears and fades away after a few seconds.