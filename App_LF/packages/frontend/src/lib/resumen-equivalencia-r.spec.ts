import { describe, expect, it } from 'vitest';
import { calcularPlan, parametrosIniciales } from './plan-cosecha';
import { construirResumenR, type Plan } from './reportes-rutapro';

function ejemplo(): Plan {
  const base = {
    hacienda: '001', lat: 3, lng: -76, edad: 13,
    tonPred: 2500, prioridad: 'Óptimo', transitabilidad: 'Alta',
    areaNeta: 2, sacarosaPred: 12,
  };
  return calcularPlan([
    { ...base, suerte: '001' },
    { ...base, suerte: '002' },
  ], [{ alce: 'IC01', lat: 3, lng: -76 }], parametrosIniciales);
}

describe('Resumen: agrupaciones de construir_tabla_resumen del R', () => {
  it('separa alces y mantiene los porcentajes sobre todo el grupo', () => {
    const plan = ejemplo();
    plan[1].Alce = 'IC02';
    plan[1].prioridad = 'Sin prioridad';
    plan[1].transitabilidad = 'Media baja';

    const resumen = construirResumenR(plan);

    expect(resumen).toHaveLength(2);
    expect(resumen.map(r => r.Alce)).toEqual(['IC01', 'IC02']);

    for (const row of resumen) {
      expect(row.n_filas).toBe(1);
      expect(row.Ton_pred_total).toBe(2500);
      expect(row['Prio_% Óptimo']).toBe(50);
      expect(row['Prio_% Sin prioridad']).toBe(50);
      expect(row['Trans_% Alta']).toBe(50);
      expect(row['Trans_% Media baja']).toBe(50);
    }
  });

  it('separa tipos del mismo grupo y alce como el R', () => {
    const plan = ejemplo();
    plan[1].Tipo_Grupo = 'Débil';

    const resumen = construirResumenR(plan);

    expect(resumen.map(r => r.Tipo_Grupo)).toEqual(['Débil', 'Fuerte']);
    expect(resumen.map(r => r.Ton_pred_total)).toEqual([2500, 2500]);
  });

  it('omite datos ausentes de la media ponderada sin perder toneladas', () => {
    const plan = ejemplo();
    delete plan[0].sacarosaPred;

    const resumen = construirResumenR(plan);

    expect(resumen).toHaveLength(1);
    expect(resumen[0].Sacarosa_pred_pond).toBe(12);
    expect(resumen[0].Ton_pred_total).toBe(5000);
    expect(resumen[0].Horas_estim).toBe(84.3);
    expect(resumen[0].Dias_estim).toBe(5.21);
    expect(construirResumenR([])).toEqual([]);
  });
});
