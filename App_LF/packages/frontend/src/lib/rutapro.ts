import { getRayfinClient } from './rayfin-client';

export type ModoRutaPRO = 'operativo' | 'validacion';

export class RutaPRODataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RutaPRODataError';
  }
}

function requireData(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RutaPRODataError(message);
}

export async function cargarRutaPRO(modo: ModoRutaPRO = 'operativo') {
  const client = await getRayfinClient();
  const connector = client.connectors.rutapro;

  const leerPublicacion = async () => {
    const page = await connector.RutaproPublicaciones
      .select(["estado","perfil","versionBackend","tablasEsperadas","aptoOperativo","backendCompleto","libreriasJson","idEjecucion","fechaCorte","publicadoUtc"])
      .first(2).executePaginated();
    requireData(!page.hasNextPage && page.items.length === 1,
      'No hay una publicación única. Revisar la publicación del notebook.');
    const publication = page.items[0];
    requireData(publication.estado === 'COMPLETO',
      'La publicación no está completa. Revisar el notebook y volver a cargar.');
    requireData(publication.idEjecucion, 'La publicación no tiene identificador.');
    return publication;
  };

  const publicacion = await leerPublicacion();
  const id = publicacion.idEjecucion;
  requireData(typeof id === 'string' && id.length > 0,
    'Identificador de publicación inválido.');
  if (modo === 'operativo') {
    requireData(publicacion.perfil === 'operativo' &&
      publicacion.aptoOperativo === true && publicacion.backendCompleto === true,
      'Los datos no están habilitados para uso operativo. Revisar los controles.');
  }

  const contractPage = await connector.RutaproContract
    .select(["objeto","tabla","filas","columnasJson","tiposJson","idEjecucion","fechaCorte","publicadoUtc"])
    .where({ idEjecucion: { eq: id } })
    .first(1000).executePaginated();
  requireData(!contractPage.hasNextPage, 'El contrato supera el límite de lectura.');
  const contrato = contractPage.items;
  requireData(typeof publicacion.tablasEsperadas === 'number' &&
    Number.isSafeInteger(publicacion.tablasEsperadas) &&
    contrato.length === publicacion.tablasEsperadas - 2,
    'El contrato no coincide con la publicación; puede estar sincronizándose.');

  const expected = new Map<string, number>();
  for (const entry of contrato) {
    requireData(entry.idEjecucion === id && typeof entry.tabla === 'string',
      'El contrato contiene una ejecución o tabla inválida.');
    const name = entry.tabla.split('.').pop();
    requireData(name && !expected.has(name), 'El contrato contiene tablas repetidas.');
    requireData(typeof entry.filas === 'number' &&
      Number.isSafeInteger(entry.filas) && entry.filas >= 0,
      'El contrato contiene un conteo inválido.');
    expected.set(name, entry.filas);
  }

  function comprobar<T extends { idEjecucion?: string }>(
    table: string,
    page: { items: T[]; hasNextPage: boolean },
  ): T[] {
    requireData(!page.hasNextPage,
      table + ': la lectura está incompleta; se necesita paginación adicional.');
    requireData(page.items.length === expected.get(table),
      table + ': el conteo no coincide con el contrato. Volver a cargar.');
    requireData(page.items.every(row => row.idEjecucion === id),
      table + ': contiene datos de otra publicación.');
    return page.items;
  }

  requireData(expected.has('rutapro_df_programa'), 'Falta rutapro_df_programa en el contrato.');
  const df_programa = comprobar('rutapro_df_programa', await connector.RutaproDfPrograma
    .select(["ano","mes","zona","hacienda","nombre","suerte","tenencia","gTenencia","areaNeta","dist","estado","cultivo","lat","lng","tchPred","tonPred","sacarosaPred","inicioPresupuesto","periodoPresupuesto","edad","pluviometro","fUltCosSiem","transitabilidad","madurante","sdam","tchAforo","tonAforo","tchPredSin","tonPredSin","sacarosaPredSin","edadHoy","prioridad","probabilidadIncendio","edadMinimaIncedio","edadMaximaIncendio","fechaIncendio","vejez","tieneCompromiso","tieneRobo","precipAyer","precipAyerDiasObservados","precip2diasAtras","precip2diasAtrasDiasObservados","precip3diasAtras","precip3diasAtrasDiasObservados","precip5diasAtras","precip5diasAtrasDiasObservados","precipManana","precipMananaDiasObservados","precip2diasAdelante","precip2diasAdelanteDiasObservados","precip3diasAdelante","precip3diasAdelanteDiasObservados","idEjecucion","fechaCorte","publicadoUtc"])
    .where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated());



  requireData(expected.has('rutapro_df_entrada_frentes'), 'Falta rutapro_df_entrada_frentes en el contrato.');
  const df_entrada_frentes = comprobar('rutapro_df_entrada_frentes', await connector.RutaproDfEntradaFrentes
    .select(["alce","lat","lng","idEjecucion","fechaCorte","publicadoUtc"])
    .where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated());







  requireData(expected.has('rutapro_df_control_calidad'), 'Falta rutapro_df_control_calidad en el contrato.');
  const df_control_calidad = comprobar('rutapro_df_control_calidad', await connector.RutaproDfControlCalidad
    .select(["modulo","estado","filas","detalle","idEjecucion","fechaCorte","publicadoUtc"])
    .where({ idEjecucion: { eq: id } })
    .first(100000).executePaginated());



  const final = await leerPublicacion();
  requireData(final.idEjecucion === id,
    'La publicación cambió durante la lectura. Volver a cargar.');
  return {
    modo, publicacion, contrato,
    df_programa,
    df_entrada_frentes,
    df_control_calidad,
  };
}

export type DatosRutaPRO = Awaited<ReturnType<typeof cargarRutaPRO>>;
