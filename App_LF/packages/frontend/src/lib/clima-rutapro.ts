import type { DatosRutaPRO } from './rutapro';
import { RutaPRODataError } from './rutapro';
import { getRayfinClient } from './rayfin-client';

function verificar(ok: unknown, mensaje: string): asserts ok {
  if (!ok) throw new RutaPRODataError(mensaje);
}

export async function cargarClima(datos: DatosRutaPRO) {
  const connector = (await getRayfinClient()).connectors.rutapro;
  const id = datos.publicacion.idEjecucion;

  async function comprobarPublicacion() {
    const p = await connector.RutaproPublicaciones
      .select(['estado', 'idEjecucion']).first(2).executePaginated();
    verificar(!p.hasNextPage && p.items.length === 1 &&
      p.items[0].estado === 'COMPLETO' && p.items[0].idEjecucion === id,
      'La publicación cambió. Actualiza los datos antes de leer el clima.');
  }

  const contrato = datos.contrato.find(r => r.objeto === 'df_climaticas');
  verificar(contrato && Number.isSafeInteger(contrato.filas),
    'Falta el conteo climático en el contrato.');

  await comprobarPublicacion();
  const page = await connector.RutaproDfClimaticas.select([
    'zona', 'hacienda', 'nombre', 'suerte', 'tenencia',
    'edad', 'corte', 'tminUltimos30', 'gdHastaHoy',
    'prioridad', 'transitabilidad', 'madurante', 'sdam',
    'mesCosecha', 'tonPred', 'sacarosaPred', 'sacarosaPredSin',
    'probabilidadIncendio', 'latC', 'lngC',
    'fechaUltimaClima', 'diasClimaUltimos30',
    'idEjecucion',
  ]).where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated();

  verificar(!page.hasNextPage && page.items.length === contrato.filas,
    'La lectura climática no coincide con el contrato.');
  const llaves = new Set<string>();
  for (const r of page.items) {
    const key = JSON.stringify([r.hacienda, r.suerte]);
    verificar(r.idEjecucion === id && r.hacienda && r.suerte &&
      !llaves.has(key), 'Hay llaves climáticas incompletas o repetidas.');
    llaves.add(key);
  }
  await comprobarPublicacion();
  return page.items;
}

export type FilaClima = Awaited<ReturnType<typeof cargarClima>>[number];
