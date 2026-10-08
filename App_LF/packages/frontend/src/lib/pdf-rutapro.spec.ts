import { describe, expect, it } from 'vitest';
import type { DatosRutaPRO } from './rutapro';
import { calcularPlan, parametrosIniciales } from './plan-cosecha';
import type { Plan } from './reportes-rutapro';
import {
  seleccionarGruposPDF, filaGrupoPDF, cabeceraGrupoPDF,
} from './pdf-rutapro';

function ejemplo(): Plan {
  const filas: DatosRutaPRO['df_programa'] = [
    { hacienda: '010001', suerte: '001', nombre: '<script>prueba</script>',
      lat: 3.277, lng: -76.318, edad: 14,
      tonPred: 1000, areaNeta: 10, prioridad: 'Óptimo' },
    { hacienda: '010001', suerte: '002', nombre: 'SEGUNDA',
      lat: 3.278, lng: -76.319, edad: 14,
      tonPred: 2000, areaNeta: 20, prioridad: 'Óptimo' },
  ];
  return calcularPlan(filas,
    [{ alce: 'IC01', lat: 3.277, lng: -76.318 }],
    parametrosIniciales,
  ).map((r, i) => ({
    ...r, Grupo: 1, Tipo_Grupo: 'Fuerte', Orden_Cosecha: 2 - i,
  }));
}

describe('PDF del programa R', () => {
  it('incluye todo el grupo aunque Alce y Prioridad no coincidan', () => {
    const grupos = seleccionarGruposPDF(ejemplo(), {
      grupo: ['1'], alce: ['IC99'], prioridad: ['Otra'],
    });
    expect(grupos).toHaveLength(1);
    expect(grupos[0].filas).toHaveLength(2);
    expect(grupos[0].filas.map(r => r.Orden_Cosecha)).toEqual([1, 2]);
  });
  it('usa todos los grupos si no hay selección y no sustituye grupos ausentes', () => {
    expect(seleccionarGruposPDF(ejemplo(), {
      grupo: [], alce: [], prioridad: [],
    })).toHaveLength(1);
    expect(seleccionarGruposPDF(ejemplo(), {
      grupo: ['99'], alce: [], prioridad: [],
    })).toEqual([]);
  });
  it('escapa datos HTML y mantiene coordenadas y color de grupo fuerte', () => {
    const fila = filaGrupoPDF(ejemplo()[0], 'Fuerte');
    expect(fila).not.toContain('<script>');
    expect(fila).toContain('&lt;script&gt;');
    expect(fila).toContain('3.2770, -76.3180');
    expect(fila).toContain('#27ae60');
  });
  it('calcula tiempo y totales del grupo completo', () => {
    const grupo = seleccionarGruposPDF(ejemplo(), {
      grupo: [], alce: [], prioridad: [],
    })[0];
    const html = cabeceraGrupoPDF(grupo, '2026-10-08 17:00');
    expect(html).toContain('3,000');
    expect(html).toContain('51.0 h');
    expect(html).toContain('Cosecha estratégica 4.1');
  });
});
