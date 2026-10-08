import { describe, expect, it } from 'vitest';
import {
  calcularAlertas, calcularDiferencia,
  indicadoresPlan, sugerenciasCalibracion,
} from './seguimiento-rutapro';

describe('Seguimiento equivalente al R', () => {
  it('no duplica toneladas en la unión y mantiene robo y arriendo separados', () => {
    const alertas = calcularAlertas([
      { tonPred: 100, vejez: 2, edad: 15, sdam: 15 },
      { tonPred: 200, prioridad: 'Robo de caña' },
      { tonPred: 300, tenencia: '28', edad: 13, edadHoy: 15, areaNeta: 4 },
    ]);
    expect(alertas.find(a => a.clave === 'total')).toMatchObject({
      valor: 100, suertes: 1,
    });
    expect(alertas.find(a => a.clave === 'robo')?.valor).toBe(200);
    expect(alertas.find(a => a.clave === 'arriendo')).toMatchObject({
      valor: 4, unidad: 'ha',
    });
  });

  it('respeta los límites de vejez, edad y SDAM del R', () => {
    const alertas = calcularAlertas([
      { tonPred: 100, vejez: 3, edad: 14, sdam: 14 },
    ]);
    expect(alertas.find(a => a.clave === 'optimo')?.suertes).toBe(0);
    expect(alertas.find(a => a.clave === 'degradacion')?.valor).toBe(100);
    expect(alertas.find(a => a.clave === 'edad')?.suertes).toBe(0);
    expect(alertas.find(a => a.clave === 'sdam')?.suertes).toBe(0);
  });

  it('usa prioridad solo cuando falta la columna Vejez', () => {
    const filas = [{ tonPred: 100, vejez: null, prioridad: 'Óptimo de vejez' }];
    expect(calcularAlertas(filas).find(a => a.clave === 'optimo')?.valor).toBe(0);
    expect(calcularAlertas(filas, { vejez: false, edadHoy: false })
      .find(a => a.clave === 'optimo')?.valor).toBe(100);
  });

  it('no sustituye Edad_hoy nula si la columna existe', () => {
    const filas = [{ tenencia: 28, edad: 15, edadHoy: null, areaNeta: 2 }];
    expect(calcularAlertas(filas).find(a => a.clave === 'arriendo')?.valor).toBe(0);
    expect(calcularAlertas(filas, { vejez: true, edadHoy: false })
      .find(a => a.clave === 'arriendo')?.valor).toBe(2);
  });

  it('compara solo filas asignadas y no redondea antes de restar', () => {
    expect(calcularDiferencia([
      { Grupo: 1, tonPred: 120.25, areaNeta: 2.25 },
      { Grupo: null, tonPred: 9000, areaNeta: 100 },
    ], [{ Grupo: 2, tonPred: 100, areaNeta: 2 }])).toEqual({
      toneladas: 20.25, area: 0.25, bloques: 0,
    });
    expect(calcularDiferencia([])).toBeNull();
    expect(indicadoresPlan([
      { Grupo: 1, tonPred: 960 },
      { Grupo: 1, tonPred: null },
    ])).toMatchObject({ bloques: 1, horas: 17, dias: 1 });
  });

  it('activa sugerencias desde 40%, el aviso desde 50% y limita los valores', () => {
    const resumen = [
      { Tipo_Grupo: 'Débil' }, { Tipo_Grupo: 'Débil' },
      { Tipo_Grupo: 'Fuerte' }, { Tipo_Grupo: 'Fuerte' },
      { Tipo_Grupo: 'Fuerte' },
    ];
    const mensajes = sugerenciasCalibracion(resumen, { minimo: 1200, radio: 14 });
    expect(mensajes).toHaveLength(2);
    expect(mensajes[0]).toContain('a 1000.');
    expect(mensajes[1]).toContain('a 15.0 km.');
    expect(sugerenciasCalibracion(resumen.slice(0, 4), {
      minimo: 1000, radio: 15,
    })).toHaveLength(1);
    expect(sugerenciasCalibracion([
      { Tipo_Grupo: 'Débil' },
      ...Array.from({ length: 3 }, () => ({ Tipo_Grupo: 'Fuerte' })),
    ], { minimo: 2000, radio: 10 })).toEqual([]);
  });
});
