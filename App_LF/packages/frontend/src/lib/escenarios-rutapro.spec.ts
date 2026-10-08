import { describe, expect, it } from 'vitest';
import { parametrosIniciales } from './plan-cosecha';
import type { Plan } from './reportes-rutapro';
import {
  capturarPreset, capturarHistorial, serializarEscenario, deserializarEscenario,
} from './escenarios-rutapro';

function programa(): Plan {
  return [{
    hacienda: '010001', suerte: '001A', nombre: 'Prueba',
    lat: 3, lng: -76, edad: 15, tonPred: 1000, areaNeta: 2.5,
    Grupo: 4, Tipo_Grupo: 'Fuerte', Orden_Cosecha: 7,
    Alce: 'IC02', Motivo_Revision: null,
  }];
}
describe('Presets e historial según el R', () => {
  it('captura controles independientes del objeto original', () => {
    const p = { ...parametrosIniciales };
    const frentes = ['IC01'];
    const preset = capturarPreset(' Configuración ', p, frentes);
    p.radio = 20; frentes.push('IC02');
    expect(preset.nombre).toBe('Configuración');
    expect(preset.parametros.radio).toBe(10);
    expect(preset.frentes).toEqual(['IC01']);
  });
  it('guarda el plan completo y sus indicadores sin filtros del mapa', () => {
    const plan = programa();
    const h = capturarHistorial('Plan', parametrosIniciales, ['IC02'], plan, false, '{}');
    plan[0].Grupo = 99;
    expect(h.plan[0].Grupo).toBe(4);
    expect(h.kpis).toEqual({ n_grupos: 1, ton_total: 1000, area_total: 2.5 });
  });
  it('restaura asignaciones, orden y fechas sin recalcular el plan', () => {
    const fecha = new Date('2026-10-07T12:00:00Z');
    const fila = { ...programa()[0], fechaEjemplo: fecha };
    const h = capturarHistorial('Plan', parametrosIniciales, ['IC02'], [fila], true, '{}');
    const restaurado = deserializarEscenario(serializarEscenario(h));
    if (restaurado.tipo !== 'historial') throw new Error('Tipo incorrecto');
    expect(restaurado.plan[0]).toMatchObject({ Grupo: 4, Orden_Cosecha: 7, Alce: 'IC02' });
    expect(Object.entries(restaurado.plan[0]).find(([k]) => k === 'fechaEjemplo')?.[1])
      .toEqual(fecha);
    expect(restaurado.pendiente).toBe(true);
  });
  it('rechaza nombres vacíos y escenarios corruptos', () => {
    expect(() => capturarPreset(' ', parametrosIniciales, [])).toThrow();
    expect(() => deserializarEscenario('{"version":1,"tipo":"historial"}')).toThrow();
  });
});
