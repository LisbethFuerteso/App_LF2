import { describe, expect, it } from 'vitest';
import { calcularPlan, parametrosIniciales, type Suerte } from './plan-cosecha';

const frente = [{ alce: 'IC01', lat: 3, lng: -76 }];
const base: Suerte = {
  hacienda: '001', suerte: '001', lat: 3, lng: -76,
  edad: 13, tonPred: 2500, prioridad: 'Óptimo', transitabilidad: 'Alta',
};
describe('Reglas del plan de cosecha del R', () => {
  it('conserva la excepción de máximo para la misma hacienda', () => {
    const resultado = calcularPlan([base, { ...base, suerte: '002', tonPred: 9000 }],
      frente, parametrosIniciales);
    expect(resultado.map(r => r.Grupo)).toEqual([1, 1]);
    expect(resultado.every(r => r.Tipo_Grupo === 'Fuerte' && r.Alce === 'IC01')).toBe(true);
  });
  it('separa otra hacienda cuando supera el máximo', () => {
    const resultado = calcularPlan([base, { ...base, hacienda: '002', tonPred: 9000 }],
      frente, parametrosIniciales);
    expect(new Set(resultado.map(r => r.Grupo)).size).toBe(2);
  });
  it('ordena los incendios urgentes antes de las suertes normales', () => {
    const resultado = calcularPlan([base, {
      ...base, suerte: '002', prioridad: 'Urgente - Incendio con alta degradación',
    }], frente, parametrosIniciales);
    expect(resultado[1].Orden_Cosecha).toBe(1);
    expect(resultado[0].Orden_Cosecha).toBe(2);
  });
  it('el riesgo mayor de diez habilita una suerte joven sin mutar la entrada', () => {
    const joven = { ...base, edad: 10, probabilidadIncendio: 11 };
    const resultado = calcularPlan([joven], frente, parametrosIniciales);
    expect(resultado[0].Grupo).toBe(1);
    expect(joven).not.toHaveProperty('Grupo');
    expect(calcularPlan([{ ...joven, probabilidadIncendio: 10 }],
      frente, parametrosIniciales)[0].Grupo).toBeNull();
  });
  it('identifica coordenadas inválidas y rechaza llaves duplicadas', () => {
    const resultado = calcularPlan([{ ...base, lat: null }], frente, parametrosIniciales);
    expect(resultado[0].Grupo).toBeNull();
    expect(resultado[0].Motivo_Revision).toBe('Coordenadas inválidas');
    expect(() => calcularPlan([base, base], frente, parametrosIniciales)).toThrow(/repetidas/);
  });
  it('comprueba el radio de todos los miembros respecto al centroide', () => {
    const resultado = calcularPlan([base, { ...base, suerte: '002', lat: 4 }],
      frente, parametrosIniciales);
    expect(new Set(resultado.map(r => r.Grupo)).size).toBe(2);
  });
  it('la transitabilidad cambia la preferencia sin excluir candidatos', () => {
    const resultado = calcularPlan([{ ...base, transitabilidad: 'Baja' }],
      frente, parametrosIniciales);
    expect(resultado[0].Grupo).toBe(1);
    expect(resultado[0].Tipo_Grupo).toBe('Débil');
  });
});
