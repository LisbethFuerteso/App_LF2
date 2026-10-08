// Paleta y dominio ordenado del comparador declarado en app_v2 2.R.
const coloresAB = [
  '#e6194B', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#469990',
];
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

const valoresLabAB = coloresAB.map(lab);

export function paletaComparador(grupos: number[]) {
  const niveles = [...new Set(grupos)].sort((a, b) => a - b);
  return (grupo: number): string => {
    const indice = niveles.indexOf(grupo);
    if (indice < 0) return '#808080';
    const t = niveles.length === 1 ? 0.5 : indice / (niveles.length - 1);
    const posicion = t * (coloresAB.length - 1);
    const inferior = Math.floor(posicion);
    if (inferior === coloresAB.length - 1) return coloresAB[inferior];
    const parte = posicion - inferior;
    if (parte === 0) return coloresAB[inferior];
    return hex(valoresLabAB[inferior].map((v, i) =>
      v + (valoresLabAB[inferior + 1][i] - v) * parte));
  };
}
