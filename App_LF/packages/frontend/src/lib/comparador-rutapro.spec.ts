import { describe, expect, it } from 'vitest';
import { calcularPlan, parametrosIniciales } from './plan-cosecha';
import type { DatosRutaPRO } from './rutapro';
import type { Plan } from './reportes-rutapro';
import {
  capturarSlot, extraerIndicadores, deltaAB, estadoSlot,
} from './comparador-rutapro';
import { paletaComparador } from './paleta-comparador';

function ejemplo(): Plan {
  const filas: DatosRutaPRO['df_programa'] = [
    { hacienda: '010001', suerte: '001', nombre: 'HACIENDA',
      lat: 3.277, lng: -76.318, edad: 14,
      tonPred: 1000, areaNeta: 10, prioridad: 'Óptimo' },
    { hacienda: '010001', suerte: '002', nombre: 'HACIENDA',
      lat: 3.278, lng: -76.319, edad: 14,
      tonPred: 2000, areaNeta: 20, prioridad: 'Óptimo' },
  ];
  return calcularPlan(
    filas,
    [{ alce: 'IC01', lat: 3.277, lng: -76.318 }],
    parametrosIniciales,
  ).map((r, i) => ({
    ...r, Grupo: 1, Tipo_Grupo: i === 0 ? 'Fuerte' : 'Débil',
    Orden_Cosecha: i + 1,
  }));
}

describe('Comparador A/B del R', () => {
  it('captura una copia independiente del programa y de los controles', () => {
    const plan = ejemplo();
    const frentes = ['IC01'];
    const parametros = { ...parametrosIniciales };
    const slot = capturarSlot(plan, parametros, frentes);
    plan[0].tonPred = 99999;
    parametros.radio = 2;
    frentes.push('IC02');
    expect(slot.plan[0].tonPred).toBe(1000);
    expect(slot.parametros.radio).toBe(10);
    expect(slot.frentes).toEqual(['IC01']);
    expect(slot.fecha).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('cuenta parejas distintas Grupo/Tipo y suma todo el plan asignado', () => {
    const slot = capturarSlot(ejemplo(), parametrosIniciales, []);
    expect(extraerIndicadores(slot)).toEqual([
      2, 3000, 30, 50, 10, 2000, 5000, 10000,
    ]);
    expect(estadoSlot(slot)).toContain('1 grupos');
  });

  it('representa slots vacíos y diferencias con los signos del R', () => {
    expect(extraerIndicadores()).toEqual(Array(8).fill(null));
    expect(estadoSlot()).toBe('Vacío');
    expect(deltaAB(null, 10)).toBe('—');
    expect(deltaAB(10, 20)).toBe('▲ 10');
    expect(deltaAB(20, 10)).toBe('▼ 10');
    expect(deltaAB(10, 10)).toBe('= 0');
  });

  it('asigna los extremos de la paleta por dominio ordenado', () => {
    const color = paletaComparador([8, 1, 8]);
    expect(color(1).toLowerCase()).toBe('#e6194b');
    expect(color(8).toLowerCase()).toBe('#469990');
    expect(color(99)).toBe('#808080');
  });
});
