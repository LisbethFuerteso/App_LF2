import { redondearR } from './reportes-rutapro';

export type FilaSeguimiento = {
  Grupo?: number | null;
  tonPred?: number | null;
  areaNeta?: number | null;
  prioridad?: string | null;
  vejez?: number | null;
  edad?: number | null;
  edadHoy?: number | null;
  sdam?: number | null;
  tenencia?: string | number | null;
};

export type DiferenciaPlan = {
  toneladas: number;
  area: number;
  bloques: number;
};

const numero = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const sumar = (
  filas: FilaSeguimiento[], campo: 'tonPred' | 'areaNeta',
) => filas.reduce((s, r) => s + (numero(r[campo]) ? r[campo] : 0), 0);

export function indicadoresPlan(filas: FilaSeguimiento[]) {
  const asignadas = filas.filter(r => r.Grupo != null);
  const toneladas = sumar(asignadas, 'tonPred');
  const area = sumar(asignadas, 'areaNeta');
  const bloques = new Set(asignadas.map(r => r.Grupo)).size;
  return {
    toneladas, area, bloques,
    horas: redondearR(toneladas / 60 + bloques, 1),
    dias: redondearR(toneladas / 960, 1),
  };
}

export function calcularDiferencia(
  nuevo: FilaSeguimiento[],
  anterior?: FilaSeguimiento[],
): DiferenciaPlan | null {
  if (!anterior) return null;
  const n = indicadoresPlan(nuevo);
  const a = indicadoresPlan(anterior);
  return {
    toneladas: n.toneladas - a.toneladas,
    area: n.area - a.area,
    bloques: n.bloques - a.bloques,
  };
}

export function calcularAlertas(
  filas: FilaSeguimiento[],
  columnas = { vejez: true, edadHoy: true },
) {
  const criterios = filas.map(r => {
    const prioridad = r.prioridad ?? '';
    return {
      optimo: columnas.vejez
        ? numero(r.vejez) && r.vejez < 3
        : /Óptimo de vejez/i.test(prioridad),
      degradacion: columnas.vejez
        ? numero(r.vejez) && r.vejez >= 3
        : /Incendio con alta degradación/i.test(prioridad),
      compromiso: /Compromiso comercial/i.test(prioridad),
      robo: /Robo/i.test(prioridad),
      arriendo: String(r.tenencia ?? '') === '28' &&
        numero(columnas.edadHoy ? r.edadHoy : r.edad) &&
        (columnas.edadHoy ? r.edadHoy! : r.edad!) > 14,
      edad: numero(r.edad) && r.edad > 14,
      sdam: numero(r.sdam) && r.sdam > 14,
    };
  });

  const definiciones = [
    ['optimo', '🔥 Incendio en óptimo (Vejez < 3 días)', '#e67e22', false],
    ['degradacion', '🧯 Incendio con alta degradación (Vejez ≥ 3)', '#c0392b', false],
    ['compromiso', '📜 Compromiso comercial', '#8e44ad', false],
    ['robo', '🦹 Ton. susceptibles de robo', '#922b21', false],
    ['arriendo', '🏘️ Área arriendo >14 meses (Ten. 28)', '#117a65', true],
    ['edad', '📅 Edad > 14 meses', '#16a085', false],
    ['sdam', '🛸 SDAM > 14', '#2980b9', false],
    ['total', '🚨 Total combinado (sin doble conteo)', '#0C25A3', false],
  ] as const;

  return definiciones.map(([clave, etiqueta, color, esArea]) => {
    const seleccionadas = filas.filter((_, i) => {
      const c = criterios[i];
      // Unión exacta del R: robo y arriendo tienen indicadores separados.
      return clave === 'total'
        ? c.optimo || c.degradacion || c.compromiso || c.edad || c.sdam
        : c[clave];
    });
    return {
      clave, etiqueta, color,
      unidad: esArea ? 'ha' : 'ton',
      suertes: seleccionadas.length,
      valor: sumar(seleccionadas, esArea ? 'areaNeta' : 'tonPred'),
    };
  });
}

export function sugerenciasCalibracion(
  resumen: { Tipo_Grupo: string | null }[],
  parametros: { minimo: number; radio: number },
): string[] {
  if (!resumen.length) return [];
  const debiles = resumen.filter(r => r.Tipo_Grupo === 'Débil').length;
  const proporcion = debiles / resumen.length;
  if (proporcion < 0.4) return [];

  const mensajes: string[] = [];
  if (proporcion >= 0.5) {
    mensajes.push(
      '🟡 ' + debiles + ' de ' + resumen.length +
      ' grupos son Débiles (' + redondearR(proporcion * 100, 0) + '%).',
    );
  }
  if (parametros.minimo > 1000) {
    mensajes.push(
      '→ Considera bajar Mínimo ton de ' + parametros.minimo +
      ' a ' + Math.max(1000, parametros.minimo - 500) + '.',
    );
  }
  if (parametros.radio < 15) {
    mensajes.push(
      '→ Considera ampliar Radio de ' + parametros.radio.toFixed(1) +
      ' a ' + Math.min(15, parametros.radio + 2).toFixed(1) + ' km.',
    );
  }
  return mensajes;
}
