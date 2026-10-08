import type { Geometry } from 'geojson';
import type { DatosRutaPRO } from './rutapro';
import { RutaPRODataError } from './rutapro';
import { getRayfinClient } from './rayfin-client';

export const llaveSuerte = (h: unknown, s: unknown) => JSON.stringify([h, s]);
export type Poligonos = Map<string, Geometry>;

function verificar(ok: unknown, message: string): asserts ok {
  if (!ok) throw new RutaPRODataError(message);
}
function coordenadas(value: unknown): boolean {
  if (!Array.isArray(value) || !value.length) return false;
  if (typeof value[0] === 'number') {
    return value.length >= 2 && value.every(n =>
      typeof n === 'number' && Number.isFinite(n)) &&
      Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
  }
  return value.every(coordenadas);
}

export async function cargarGeometriasClima(datos: DatosRutaPRO): Promise<Poligonos> {
  const client = await getRayfinClient();
  const connector = client.connectors.rutapro;
  const id = datos.publicacion.idEjecucion;

  const verificarPublicacion = async () => {
    const page = await connector.RutaproPublicaciones
      .select(['estado', 'idEjecucion']).first(2).executePaginated();
    verificar(!page.hasNextPage && page.items.length === 1 &&
      page.items[0].estado === 'COMPLETO' && page.items[0].idEjecucion === id,
      'La publicación cambió. Actualiza los datos y recalcula el plan.');
  };

  const contrato = datos.contrato.find(r => r.objeto === 'df_climaticas');
  verificar(contrato && Number.isSafeInteger(contrato.filas),
    'Falta el conteo de elemento climáticos en el contrato.');

  await verificarPublicacion();
  const page = await connector.RutaproClimateChunk
    .select([
      'hacienda', 'suerte', 'segmento', 'totalSegmentos',
      'geometryLongitud', 'geometrySha256', 'geometrySrid',
      'geometryFragmento', 'idEjecucion',
    ])
    .where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated();

  verificar(!page.hasNextPage,
    'La lectura de fragmentos está incompleta; requiere paginación adicional.');

  type Fragmento = typeof page.items[number];
  const grupos = new Map<string, Fragmento[]>();

  for (const row of page.items) {
    verificar(row.idEjecucion === id && row.hacienda && row.suerte,
      'Hay fragmentos con publicación o llave inválida.');
    const key = llaveSuerte(row.hacienda, row.suerte);
    const grupo = grupos.get(key) ?? [];
    grupo.push(row);
    grupos.set(key, grupo);
  }

  verificar(grupos.size === contrato.filas,
    'Los fragmentos no cubren todos los elemento climáticos de la publicación.');


  const resultado: Poligonos = new Map();

  for (const [key, chunks] of grupos) {
    const primero = chunks[0];
    verificar(
      Number.isSafeInteger(primero.totalSegmentos) &&
      primero.totalSegmentos! > 0 &&
      chunks.length === primero.totalSegmentos,
      'Faltan fragmentos de un elemento climático.'
    );
    verificar(
      Number.isSafeInteger(primero.geometryLongitud) &&
      primero.geometryLongitud! > 0 &&
      typeof primero.geometrySha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(primero.geometrySha256),
      'Longitud o huella de geometría inválida.'
    );

    chunks.sort((a, b) => a.segmento! - b.segmento!);
    chunks.forEach((r, index) => {
      verificar(
        r.segmento === index &&
        r.totalSegmentos === primero.totalSegmentos &&
        r.geometryLongitud === primero.geometryLongitud &&
        r.geometrySha256 === primero.geometrySha256 &&
        r.geometrySrid === 4326 &&
        typeof r.geometryFragmento === 'string' &&
        r.geometryFragmento.length > 0 &&
        r.geometryFragmento.length <= 4000 &&
        Array.from(r.geometryFragmento).every(c => c.charCodeAt(0) <= 127),
        'Hay fragmentos repetidos, incompletos o inconsistentes.'
      );
    });

    const texto = chunks.map(r => r.geometryFragmento).join('');
    verificar(texto.length === primero.geometryLongitud,
      'La geometría reconstruida tiene una longitud incorrecta.');

    const digest = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(texto)
    );
    const sha = Array.from(new Uint8Array(digest))
      .map(n => n.toString(16).padStart(2, '0')).join('');
    verificar(sha === primero.geometrySha256,
      'La geometría reconstruida no coincide con su huella SHA-256.');



    let geometry: unknown;
    try { geometry = JSON.parse(texto); }
    catch { throw new RutaPRODataError('La geometría reconstruida no es JSON válido.'); }

    verificar(geometry && typeof geometry === 'object' &&
      'type' in geometry && 'coordinates' in geometry &&
      ['Polygon', 'MultiPolygon', 'Point'].includes(String(geometry.type)) &&
      coordenadas(geometry.coordinates),
      'La geometría reconstruida no es un elemento climático WGS84 válido.');

    resultado.set(key, geometry as Geometry);
  }

  await verificarPublicacion();
  return resultado;
}
