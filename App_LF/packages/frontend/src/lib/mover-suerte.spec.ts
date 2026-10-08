import { describe, expect, it } from 'vitest';
import {
  claveMovimiento, moverSuerte, type FilaMovimiento,
} from './mover-suerte';

function base(): FilaMovimiento[] {
  return [
    { hacienda: '010001', suerte: '001', lat: 3, lng: -76,
      tonPred: 20000, Grupo: 1, Tipo_Grupo: 'Fuerte',
      Orden_Cosecha: 1, Alce: 'IC01', prioridad: 'Sin prioridad' },
    { hacienda: '010001', suerte: '002', lat: 3, lng: -76,
      tonPred: 1000, Grupo: 1, Tipo_Grupo: 'Fuerte',
      Orden_Cosecha: 2, Alce: 'IC01', prioridad: 'Sin prioridad' },
    { hacienda: '010002', suerte: '001A', lat: 3, lng: -76,
      tonPred: 1000, Grupo: 2, Tipo_Grupo: 'Débil',
      Orden_Cosecha: 1, Alce: 'IC02', prioridad: 'Óptimo de vejez' },
  ];
}
describe('Traslado de suertes según el R', () => {
  it('hereda tipo/alce sin imponer un máximo de toneladas al traslado', () => {
    const rows = base();
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {});
    expect(r.ok).toBe(true);
    expect(r.plan[0]).toMatchObject({
      Grupo: 2, Tipo_Grupo: 'Débil', Alce: 'IC02',
    });
    expect(r.importaciones[2]).toBe(1);
    expect(rows[0].Grupo).toBe(1);
  });
  it('recalcula ambos órdenes y atiende primero incendio/vejez', () => {
    const rows = base();
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {});
    expect(r.plan[1].Orden_Cosecha).toBe(1);
    expect(r.plan[2].Orden_Cosecha).toBe(1);
    expect(r.plan[0].Orden_Cosecha).toBe(2);
  });
  it('rechaza la cuarta importación sin modificar los datos', () => {
    const rows = base();
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, { 2: 3 });
    expect(r.ok).toBe(false);
    expect(r.plan).toEqual(rows);
    expect(r.importaciones).toEqual({ 2: 3 });
  });
  it('acepta la tercera importación', () => {
    const rows = base();
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, { 2: 2 });
    expect(r.ok).toBe(true);
    expect(r.importaciones[2]).toBe(3);
  });
  it('comprueba el radio respecto al centro del destino', () => {
    const rows = base();
    rows[2].lat = 4;
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {});
    expect(r.ok).toBe(false);
    expect(r.mensaje).toContain('Fuera de radio');
    expect(r.plan).toEqual(rows);
  });
  it('conserva el contador del destino anterior al trasladar de nuevo', () => {
    const rows = base();
    const a = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {});
    const b = moverSuerte(a.plan, claveMovimiento(rows[0]), 1, 10, a.importaciones);
    expect(b.ok).toBe(true);
    expect(b.importaciones).toEqual({ 1: 1, 2: 1 });
  });
  it('rechaza suertes sin asignar y destinos inexistentes', () => {
    const rows = base();
    expect(moverSuerte(rows, claveMovimiento(rows[0]), 99, 10, {}).ok).toBe(false);
    rows[0].Grupo = null;
    expect(moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {}).mensaje)
      .toBe('Suerte no asignada');
  });
  it('conserva el alce original cuando el destino no tiene alce', () => {
    const rows = base();
    rows[2].Alce = null;
    const r = moverSuerte(rows, claveMovimiento(rows[0]), 2, 10, {});
    expect(r.plan[0].Alce).toBe('IC01');
  });
});
