export interface Suerte {
  hacienda?: string | null;
  suerte?: string | null;
  lat?: number | null;
  lng?: number | null;
  edad?: number | null;
  probabilidadIncendio?: number | null;
  tonPred?: number | null;
  prioridad?: string | null;
  transitabilidad?: string | null;
}
export interface Frente {
  alce?: string | null;
  lat?: number | null;
  lng?: number | null;
}
export interface Parametros {
  radio: number;
  minimo: number;
  objetivo: number;
  maximo: number;
  filtroTransitabilidad: boolean;
}
export const parametrosIniciales: Parametros = {
  radio: 10, minimo: 2000, objetivo: 5000, maximo: 10000,
  filtroTransitabilidad: true,
};
const preferidas = new Set([
  'Urgente - Alta Semanas', 'Urgente - Alta Edad', 'Óptimo',
  'Óptimo - Robo de caña', 'Sin prioridad - Robo de caña',
  'Robo de caña', 'Urgente - Incendio con alta degradación',
  'Urgente - Incendio con alta degradación - Robo de caña',
  'Urgente - Alta Edad - Robo de caña', 'Óptimo de vejez',
]);
const numero = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);
function posicion(p: { lat?: number | null; lng?: number | null }) {
  return numero(p.lat) && numero(p.lng) &&
    Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}
export function distanciaKm(a: Frente, b: Frente): number {
  if (!posicion(a) || !posicion(b)) return Infinity;
  const rad = Math.PI / 180;
  const dLat = (b.lat! - a.lat!) * rad;
  const dLng = (b.lng! - a.lng!) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat! * rad) * Math.cos(b.lat! * rad) *
    Math.sin(dLng / 2) ** 2;
  return 6378.137 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
function centro(rows: Suerte[]): Frente {
  return {
    lat: rows.reduce((s, r) => s + r.lat!, 0) / rows.length,
    lng: rows.reduce((s, r) => s + r.lng!, 0) / rows.length,
  };
}
function cercano<T extends Frente>(origen: Frente, rows: T[]): T {
  return rows.reduce((mejor, row) =>
    distanciaKm(origen, row) < distanciaKm(origen, mejor) ? row : mejor);
}
function urgente(row: Suerte) {
  return /Incendio con alta degradación|Óptimo de vejez/i.test(row.prioridad ?? '');
}
export function calcularPlan<T extends Suerte>(
  entrada: readonly T[], frentes: readonly Frente[], p: Parametros,
) {
  if (![p.radio, p.minimo, p.objetivo, p.maximo].every(numero) ||
      p.radio <= 0 || p.minimo <= 0 ||
      p.minimo > p.objetivo || p.objetivo > p.maximo)
    throw new Error('Revisar parámetros: mínimo ≤ objetivo ≤ máximo y radio positivo.');
  if (!frentes.length)
    throw new Error('⚠️ Debe seleccionar al menos un frente activo.');
  if (frentes.some(f => !f.alce || !posicion(f)) ||
      new Set(frentes.map(f => f.alce)).size !== frentes.length)
    throw new Error('Hay frentes sin código, repetidos o sin coordenadas válidas.');

  const llaves = new Set<string>();
  const rows = entrada.map(row => {
    const key = JSON.stringify([row.hacienda, row.suerte]);
    if (row.hacienda && row.suerte) {
      if (llaves.has(key)) throw new Error('El programa contiene Hacienda/Suerte repetidas.');
      llaves.add(key);
    }
    const motivo = !row.hacienda || !row.suerte ? 'Llave incompleta' :
      !posicion(row) ? 'Coordenadas inválidas' :
      !numero(row.tonPred) || row.tonPred <= 0 ? 'Toneladas inválidas' : null;
    return {
      ...row, Grupo: null as number | null,
      Tipo_Grupo: null as 'Fuerte' | 'Débil' | null,
      Orden_Cosecha: null as number | null,
      Alce: null as string | null, Motivo_Revision: motivo,
    };
  });
  type Row = typeof rows[number];
  const elegible = (r: Row) => !r.Motivo_Revision &&
    ((numero(r.edad) && r.edad >= 12.5) ||
     (numero(r.probabilidadIncendio) && r.probabilidadIncendio > 10));
  const preferida = (r: Row) => preferidas.has(r.prioridad ?? '') &&
    (!p.filtroTransitabilidad || r.transitabilidad == null ||
      ['Alta', 'Media alta'].includes(r.transitabilidad));
  const toneladas = (list: Row[]) => list.reduce((s, r) => s + r.tonPred!, 0);
  const proporcion = (list: Row[]) =>
    toneladas(list.filter(preferida)) / toneladas(list);
  const disponibles = () => rows.filter(r => r.Grupo === null && elegible(r));
  let grupo = 0;

  while (disponibles().length) {
    const libres = disponibles();
    const preferidasLibres = libres.filter(preferida);
    const semillas = preferidasLibres.length ? preferidasLibres : libres;
    const semilla = semillas.reduce((a, b) => b.tonPred! > a.tonPred! ? b : a);
    const miembros = new Set<Row>([semilla]);
    const seleccion = () => rows.filter(r => miembros.has(r));
    let punto = centro(seleccion());

    while (true) {
      const actuales = seleccion();
      const haciendas = new Set(actuales.map(r => r.hacienda));
      const misma = (r: Row) => haciendas.has(r.hacienda);
      const candidatos = disponibles().filter(r => !miembros.has(r) &&
        distanciaKm(punto, r) <= p.radio &&
        (toneladas(actuales) < p.maximo || misma(r)));
      candidatos.sort((a, b) =>
        Number(misma(b)) - Number(misma(a)) ||
        Number(preferida(b)) - Number(preferida(a)) ||
        b.tonPred! - a.tonPred! ||
        distanciaKm(punto, a) - distanciaKm(punto, b));
      const siguiente = candidatos.find(r => {
        const propuesta = [...actuales, r];
        if (toneladas(propuesta) > p.maximo && !misma(r)) return false;
        if (proporcion(propuesta) < 0.70) return false;
        const nuevo = centro(propuesta);
        return propuesta.every(x => distanciaKm(nuevo, x) <= p.radio);
      });
      if (!siguiente) break;
      miembros.add(siguiente);
      const nuevos = seleccion();
      punto = centro(nuevos);
      if (toneladas(nuevos) >= p.objetivo) {
        const hs = new Set(nuevos.map(r => r.hacienda));
        if (!disponibles().some(r => !miembros.has(r) &&
          hs.has(r.hacienda) && distanciaKm(punto, r) <= p.radio)) break;
      }
    }

    const bloque = seleccion();
    const tipo = toneladas(bloque) >= p.minimo && proporcion(bloque) >= 0.70
      ? 'Fuerte' : 'Débil';
    grupo++;
    const orden: Row[] = [];
    let origen = centro(bloque);
    for (const pendientes of [bloque.filter(urgente), bloque.filter(r => !urgente(r))]) {
      while (pendientes.length) {
        const siguiente = cercano(origen, pendientes);
        orden.push(siguiente);
        pendientes.splice(pendientes.indexOf(siguiente), 1);
        origen = siguiente;
      }
    }
    const frente = cercano(orden[0], [...frentes]).alce!;
    orden.forEach((r, i) => {
      r.Grupo = grupo;
      r.Tipo_Grupo = tipo;
      r.Orden_Cosecha = i + 1;
      r.Alce = frente;
    });
  }
  return rows;
}
