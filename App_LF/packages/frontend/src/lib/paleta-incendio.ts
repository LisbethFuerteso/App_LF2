// Interpolación CIELAB de la paleta declarada en el R.
const colores = ['#fff3cd', '#f39c12', '#c0392b'];

function lab(hex: string): number[] {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb;
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const f = (v: number) => v > 216 / 24389
    ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
function hex(labValue: number[]): string {
  const [l, a, b] = labValue;
  const fy = (l + 16) / 116;
  const inverse = (v: number) => v ** 3 > 216 / 24389
    ? v ** 3 : (116 * v - 16) / (24389 / 27);
  const x = inverse(fy + a / 500) * 0.95047;
  const y = inverse(fy);
  const z = inverse(fy - b / 200) * 1.08883;
  const rgb = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ].map(v => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
    .map(v => Math.round(Math.max(0, Math.min(1, v)) * 255));
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}
const valoresLab = colores.map(lab);

export function paletaIncendio(valores: number[]) {
  const min = Math.min(...valores), max = Math.max(...valores);
  return (value: number): string => {
    const t = max === min ? 0.5 : (value - min) / (max - min);
    if (!Number.isFinite(t) || t < 0 || t > 1) return '#808080';
    if (t === 0) return colores[0];
    if (t === 0.5) return colores[1];
    if (t === 1) return colores[2];
    const tramo = t < 0.5 ? 0 : 1;
    const parte = t * 2 - tramo;
    return hex(valoresLab[tramo].map((v, i) =>
      v + (valoresLab[tramo + 1][i] - v) * parte));
  };
}
