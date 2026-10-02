const bands = [
  { label: 'Underweight', range: '<18.5', color: '#34b9e5', min: 12, max: 18.5 },
  { label: 'Healthy', range: '18.5–24.9', color: '#79bd35', min: 18.5, max: 25 },
  { label: 'Overweight', range: '25–29.9', color: '#f5ce37', min: 25, max: 30 },
  { label: 'Obesity', range: '30–34.9', color: '#f39a35', min: 30, max: 35 },
  { label: 'Obesity II+', range: '≥35', color: '#e55759', min: 35, max: 42 },
];
export function bmiBand(value) { return bands.find(b => value < b.max) || bands.at(-1); }
export function bmiAngle(value) {
  const index = bands.findIndex(b => value < b.max);
  const i = index < 0 ? 4 : index;
  const b = bands[i];
  return 180 + (i + Math.max(0, Math.min(1, (value - b.min) / (b.max - b.min)))) * 36;
}
const point = (radius, angle) => {
  const radians = angle * Math.PI / 180;
  return [260 + radius * Math.cos(radians), 250 + radius * Math.sin(radians)];
};
export function gauge(bmi) {
  const band = bmiBand(bmi);
  const segments = bands.map((b,i) => {
    const start = 180+i*36+0.8, end = 180+(i+1)*36-0.8;
    const a=point(214,start), z=point(214,end), c=point(123,end), d=point(123,start);
    const label=point(172,198+i*36);
    return `<path d="M${a} A214 214 0 0 1 ${z} L${c} A123 123 0 0 0 ${d} Z" fill="${b.color}"/><text x="${label[0]}" y="${label[1]}" transform="rotate(${i*36-72} ${label[0]} ${label[1]})" text-anchor="middle" dominant-baseline="middle" class="bmi-range">${b.range.replace('<','&lt;')}</text>`;
  }).join('');
  const needle=point(179,bmiAngle(bmi));
  return `<div class="bmi-display"><svg class="bmi-dial" viewBox="0 0 520 282" role="img" aria-label="BMI ${bmi.toFixed(1)}, ${band.label}"><path d="M32 250 A228 228 0 0 1 488 250" fill="none" stroke="#edf2f9" stroke-width="14"/>${segments}<path d="M250 252 L${needle} L270 252 Z" fill="#1c3261"/><circle cx="260" cy="250" r="17" fill="#1c3261"/><circle cx="260" cy="250" r="7" fill="#fff"/></svg><div class="bmi-result"><span class="bmi-eyebrow">YOUR BMI</span><strong>${bmi.toFixed(1)}</strong><span class="bmi-status" style="--band-color:${band.color}">${band.label}</span></div><div class="bmi-legend">${bands.map(b=>`<div><span class="bmi-dot" style="background:${b.color}"></span><span>${b.label}</span><strong>${b.range.replace('<','&lt;')}</strong></div>`).join('')}</div></div>`;
}
