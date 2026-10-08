import type { LineString, MultiLineString } from 'geojson';
import type { DatosRutaPRO } from './rutapro';
import { RutaPRODataError } from './rutapro';
import { getRayfinClient } from './rayfin-client';

export type Via = {
  id: string;
  origen: 'Internas' | 'Principales';
  codigo?: number;
  nombre?: string;
  geometry: LineString | MultiLineString;
};

function verificar(ok: unknown, mensaje: string): asserts ok {
  if (!ok) throw new RutaPRODataError(mensaje);
}
function punto(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 2 &&
    value.every(n => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
function linea(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 2 && value.every(punto);
}
function geometria(value: unknown): value is LineString | MultiLineString {
  if (!value || typeof value !== 'object' ||
      !('type' in value) || !('coordinates' in value)) return false;
  return value.type === 'LineString' ? linea(value.coordinates) :
    value.type === 'MultiLineString' &&
    Array.isArray(value.coordinates) && value.coordinates.length > 0 &&
    value.coordinates.every(linea);
}

export async function cargarVias(datos: DatosRutaPRO): Promise<Via[]> {
  const connector = (await getRayfinClient()).connectors.rutapro;
  const id = datos.publicacion.idEjecucion;

  async function comprobarPublicacion() {
    const p = await connector.RutaproPublicaciones
      .select(['estado', 'idEjecucion']).first(2).executePaginated();
    verificar(!p.hasNextPage && p.items.length === 1 &&
      p.items[0].estado === 'COMPLETO' && p.items[0].idEjecucion === id,
      'La publicación cambió. Actualiza los datos antes de leer las vías.');
  }

  await comprobarPublicacion();
  const page = await connector.RutaproRoadChunk.select([
    'origen', 'idVia', 'codvia', 'nomvip', 'segmento', 'totalSegmentos',
    'geometryLongitud', 'geometrySha256', 'geometrySrid',
    'geometryFragmento', 'idEjecucion',
  ]).where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated();

  verificar(!page.hasNextPage, 'La lectura de las vías está incompleta.');

  type Fragmento = typeof page.items[number];
  const grupos = new Map<string, Fragmento[]>();
  for (const r of page.items) {
    verificar(r.idEjecucion === id &&
      typeof r.idVia === 'string' && /^[a-f0-9]{64}$/.test(r.idVia) &&
      (r.origen === 'Internas' || r.origen === 'Principales'),
      'Hay fragmentos de vías con identificación inválida.');
    const grupo = grupos.get(r.idVia) ?? [];
    grupo.push(r);
    grupos.set(r.idVia, grupo);
  }

  const resultado: Via[] = [];
  for (const [key, partes] of grupos) {
    const primero = partes[0];
    verificar(Number.isSafeInteger(primero.totalSegmentos) &&
      primero.totalSegmentos! > 0 && partes.length === primero.totalSegmentos &&
      Number.isSafeInteger(primero.geometryLongitud) &&
      primero.geometryLongitud! > 0 &&
      typeof primero.geometrySha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(primero.geometrySha256),
      'Faltan fragmentos o metadatos de una vía.');

    partes.sort((a, b) => a.segmento! - b.segmento!);
    partes.forEach((r, i) => verificar(
      r.segmento === i && r.totalSegmentos === primero.totalSegmentos &&
      r.geometryLongitud === primero.geometryLongitud &&
      r.geometrySha256 === primero.geometrySha256 &&
      r.origen === primero.origen && r.codvia === primero.codvia &&
      r.nomvip === primero.nomvip && r.geometrySrid === 4326 &&
      typeof r.geometryFragmento === 'string' &&
      r.geometryFragmento.length > 0 && r.geometryFragmento.length <= 4000 &&
      Array.from(r.geometryFragmento).every(c => c.charCodeAt(0) <= 127),
      'Una vía tiene fragmentos repetidos o inconsistentes.'
    ));

    const texto = partes.map(r => r.geometryFragmento).join('');
    verificar(texto.length === primero.geometryLongitud,
      'La longitud reconstruida de una vía no coincide.');
    const digest = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(texto)
    );
    const sha = Array.from(new Uint8Array(digest))
      .map(n => n.toString(16).padStart(2, '0')).join('');
    verificar(sha === primero.geometrySha256,
      'La huella SHA-256 de una vía no coincide.');

    let geometry: unknown;
    try { geometry = JSON.parse(texto); }
    catch { throw new RutaPRODataError('Una vía reconstruida no es JSON válido.'); }
    verificar(geometria(geometry), 'Una vía no es una línea WGS84 válida.');
    verificar(primero.origen === 'Internas' || primero.origen === 'Principales',
      'Origen de vía inválido.');
    resultado.push({
      id: key, origen: primero.origen,
      codigo: primero.codvia, nombre: primero.nomvip, geometry,
    });
  }

  for (const [origen, objeto] of [
    ['Internas', 'vid_wgs84'], ['Principales', 'vip_wgs84'],
  ]) {
    const contrato = datos.contrato.find(r => r.objeto === objeto);
    verificar(contrato && Number.isSafeInteger(contrato.filas) &&
      resultado.filter(r => r.origen === origen).length === contrato.filas,
      'El conteo de vías ' + origen + ' no coincide con el contrato.');
  }

  await comprobarPublicacion();
  return resultado;
}
