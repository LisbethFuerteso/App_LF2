import { describe, expect, it } from 'vitest';
import {
  asignarAlces, colorGD, colorTransitabilidad, distanciaKm,
  emojiMadurante, emojisPrioridad, pesoPrioridad, prioridadActiva,
} from './reglas-clima';

describe('Reglas climáticas del R', () => {
  it('mantiene el umbral estricto de GD', () => {
    expect(colorGD(1800)).toBe('#c0392b');
    expect(colorGD(1800.01)).toBe('#6b8e23');
    expect(colorGD(null)).toBe('#c0392b');
  });

  it('mantiene colores de transitabilidad y categoría desconocida', () => {
    expect(colorTransitabilidad('Alta')).toBe('#1565C0');
    expect(colorTransitabilidad('Media alta')).toBe('#2E7D32');
    expect(colorTransitabilidad('Media baja')).toBe('#F9A825');
    expect(colorTransitabilidad('No transitable')).toBe('#B71C1C');
    expect(colorTransitabilidad('Desconocida')).toBe('#9E9E9E');
  });

  it('respeta los límites SDAM y los nombres exactos del madurante', () => {
    const bonus = 'BONUS 250 EC REGULADOR FISIOLOGICO';
    expect(emojiMadurante(bonus, 7.99)).toBe('');
    expect(emojiMadurante(bonus, 8)).toBe('🟢');
    expect(emojiMadurante(bonus, 12)).toBe('🟢');
    expect(emojiMadurante(bonus, 12.01)).toBe('❗');
    expect(emojiMadurante('FUSILADE 2000', null)).toBe('🚨');
    expect(emojiMadurante('BONUS', 10)).toBe('');
  });

  it('mantiene el orden y las condiciones de los emojis', () => {
    expect(emojisPrioridad({
      prioridad: 'Robo Óptimo de vejez Incendio con alta degradación Compromiso comercial',
      probabilidadIncendio: 21,
    })).toBe('🔥🦹🚒🧯📜');
    expect(emojisPrioridad({ probabilidadIncendio: 20 })).toBe('');
  });

  it('respeta la precedencia de pesos del heatmap', () => {
    expect(pesoPrioridad({
      prioridad: 'Urgente - Robo de caña - Incendio con alta degradación',
    })).toBe(3);
    expect(pesoPrioridad({ prioridad: 'Óptimo de vejez' })).toBe(4);
    expect(pesoPrioridad({
      prioridad: 'Urgente - Alta Edad', probabilidadIncendio: 30,
    })).toBe(2);
    expect(pesoPrioridad({ probabilidadIncendio: 21 })).toBe(3);
    expect(pesoPrioridad({})).toBe(0);
  });

  it('no activa la capa de prioridades por alta edad solamente', () => {
    expect(prioridadActiva({ prioridad: 'Urgente - Alta Edad' })).toBe(false);
    expect(prioridadActiva({ probabilidadIncendio: 21 })).toBe(true);
    expect(prioridadActiva({ prioridad: 'Compromiso comercial' })).toBe(true);
  });

  it('usa el radio de Haversine de geosphere', () => {
    expect(distanciaKm(0, 0, 0, 1)).toBeCloseTo(111.319490793, 8);
  });

  it('selecciona el más cercano y conserva el primero en empates', () => {
    const filas = [{ latC: 3, lngC: -76 }];
    const frentes = [
      { alce: 'IC01', lat: 3, lng: -76 },
      { alce: 'IC02', lat: 3, lng: -76 },
      { alce: 'IC03', lat: 4, lng: -76 },
    ];
    expect(asignarAlces(filas, frentes)[0].Alce_cercano).toBe('IC01');
    expect(asignarAlces(filas, frentes)[0].Dist_Alce_km).toBe(0);
  });

  it('sin frentes deja la asignación vacía, sin inventar un alce', () => {
    expect(asignarAlces([{ latC: 3, lngC: -76 }], [])[0])
      .toMatchObject({ Alce_cercano: null, Dist_Alce_km: null });
  });

  it('rechaza coordenadas inválidas al calcular distancias', () => {
    expect(() => asignarAlces(
      [{ latC: NaN, lngC: -76 }],
      [{ alce: 'IC01', lat: 3, lng: -76 }],
    )).toThrow();
  });
});
