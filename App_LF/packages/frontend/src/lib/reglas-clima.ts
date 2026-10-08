import type { FilaClima } from './clima-rutapro';

export const UMBRAL_GD = 1800;
export const UMBRAL_INCENDIO = 5;
export const MADURANTES_VERDE = [
  'BONUS 250 EC REGULADOR FISIOLOGICO',
  'REGULADOR FISIOLOGICO OPTIMUS',
];
export const MADURANTES_ROJO = ['FUSILADE 2000'];

type Frente = {
  alce?: string | null;
  lat?: number | null;
  lng?: number | null;
};
type Prioridad = {
  prioridad?: string | null;
  probabilidadIncendio?: number | null;
};

export function colorGD(gd?: number | null) {
  return gd != null && gd > UMBRAL_GD ? '#6b8e23' : '#c0392b';
}

export function colorTransitabilidad(value?: string | null) {
  if (!value || value === 'NA') return '#9E9E9E';
  if (/^Alta$/i.test(value)) return '#1565C0';
  if (/Media alta/i.test(value)) return '#2E7D32';
  if (/Media baja/i.test(value)) return '#F9A825';
  if (/No transitable/i.test(value)) return '#B71C1C';
  return '#9E9E9E';
}

export function emojiMadurante(m?: string | null, sdam?: number | null) {
  if (m == null) return '';
  if (MADURANTES_ROJO.includes(m)) return '🚨';
  if (MADURANTES_VERDE.includes(m)) {
    if (sdam != null && sdam > 12) return '❗';
    if (sdam != null && sdam >= 8 && sdam <= 12) return '🟢';
  }
  return '';
}

export function emojisPrioridad(r: Prioridad) {
  const p = r.prioridad ?? '';
  let extras = '';
  if ((r.probabilidadIncendio ?? 0) > 20) extras += '🔥';
  if (/Robo/i.test(p)) extras += '🦹';
  if (/Óptimo de vejez/i.test(p)) extras += '🚒';
  if (/Incendio con alta degradación/i.test(p)) extras += '🧯';
  if (/Compromiso comercial/i.test(p)) extras += '📜';
  return extras;
}

// El orden de estas condiciones reproduce case_when del R.
export function pesoPrioridad(r: Prioridad) {
  const p = r.prioridad ?? '';
  if (/Robo/i.test(p)) return 3;
  if (/Compromiso comercial/i.test(p)) return 3;
  if (/Incendio con alta degradación/i.test(p)) return 4;
  if (/Óptimo de vejez/i.test(p)) return 4;
  if (/Urgente/i.test(p)) return 2;
  if ((r.probabilidadIncendio ?? 0) > 20) return 3;
  return 0;
}

export function prioridadActiva(r: Prioridad) {
  return /Robo|Compromiso comercial|Incendio con alta degradación|Óptimo de vejez/i
    .test(r.prioridad ?? '') || (r.probabilidadIncendio ?? 0) > 20;
}

export function distanciaKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 6378.137 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

function redondear2(n: number) {
  const valor = n * 100;
  const inferior = Math.floor(valor);
  const parte = valor - inferior;
  const tolerancia = Number.EPSILON * Math.max(1, Math.abs(valor)) * 2;
  const entero = Math.abs(parte - 0.5) <= tolerancia
    ? (inferior % 2 === 0 ? inferior : inferior + 1)
    : Math.round(valor);
  return entero / 100;
}

function coordenada(lat: unknown, lng: unknown) {
  return typeof lat === 'number' && Number.isFinite(lat) &&
    typeof lng === 'number' && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function asignarAlces<T extends Pick<FilaClima, 'latC' | 'lngC'>>(
  filas: T[], frentes: Frente[],
) {
  for (const f of frentes) {
    if (!f.alce || !coordenada(f.lat, f.lng))
      throw new Error('Un frente activo no tiene código o coordenadas válidas.');
  }

  return filas.map(row => {
    if (!frentes.length)
      return { ...row, Alce_cercano: null, Dist_Alce_km: null };

    if (!coordenada(row.latC, row.lngC))
      throw new Error('Un registro climático no tiene un centroide válido.');

    let indice = 0;
    let minimo = Infinity;
    frentes.forEach((f, i) => {
      const distancia = distanciaKm(row.latC!, row.lngC!, f.lat!, f.lng!);
      // En un empate se conserva el primer frente, igual que en R.
      if (distancia < minimo) {
        minimo = distancia;
        indice = i;
      }
    });
    return {
      ...row,
      Alce_cercano: frentes[indice].alce!,
      Dist_Alce_km: redondear2(minimo),
    };
  });
}
