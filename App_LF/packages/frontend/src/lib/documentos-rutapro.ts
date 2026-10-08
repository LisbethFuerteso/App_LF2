import { getRayfinClient } from './rayfin-client';
import type {
  RutaproSavedDocumentRecord, RutaproSavedDocumentChunkRecord,
} from '@rayfin-app/shared';

export class DocumentoError extends Error {}

export async function claveDocumento(tipo: unknown, nombre: unknown): Promise<string> {
  if ((tipo !== 'preset' && tipo !== 'historial') ||
      typeof nombre !== 'string' || !nombre)
    throw new DocumentoError('El tipo o nombre del escenario no es válido.');
  return hashDocumento(JSON.stringify([tipo, nombre]));
}

// Equivalente a los espacios que elimina trimws() por defecto en el R.
export const limpiarDocumento = (texto: string) =>
  texto.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

export function fragmentarDocumento(texto: string): string[] {
  const salida: string[] = [];
  let fragmento = '';
  // Recorre caracteres completos para no dividir un emoji entre fragmentos.
  for (const caracter of texto) {
    if (fragmento.length + caracter.length > 2000) {
      salida.push(fragmento);
      fragmento = '';
    }
    fragmento += caracter;
  }
  if (fragmento) salida.push(fragmento);
  return salida;
}

export function unirDocumento(
  filas: readonly { segmento: number; texto: string }[],
  cantidad: number,
): string {
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 ||
      filas.length !== cantidad)
    throw new DocumentoError('El documento está incompleto.');
  const ordenadas = [...filas].sort((a, b) => a.segmento - b.segmento);
  for (let i = 0; i < ordenadas.length; i++) {
    const fila = ordenadas[i];
    if (fila.segmento !== i || typeof fila.texto !== 'string' ||
        !fila.texto.length || fila.texto.length > 4000)
      throw new DocumentoError('Los fragmentos del documento no son válidos.');
  }
  return ordenadas.map(r => r.texto).join('');
}

export async function hashDocumento(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(texto),
  );
  return Array.from(new Uint8Array(hash))
    .map(n => n.toString(16).padStart(2, '0')).join('');
}

async function buscarDocumento(llave: string) {
  const client = await getRayfinClient();
  const pagina = await client.data.RutaproSavedDocument
    .select(['id', 'llave', 'revision', 'fragmentos',
      'longitud', 'sha256', 'actualizada'])
    .where({ llave: { eq: llave } }).first(2).executePaginated();

  if (pagina.hasNextPage || pagina.items.length > 1)
    throw new DocumentoError('Hay documentos repetidos para la misma nombre.');
  return pagina.items[0] ?? null;
}

async function leerFragmentos(meta: RutaproSavedDocumentRecord) {
  const client = await getRayfinClient();
  const filas: RutaproSavedDocumentChunkRecord[] = [];
  const cursores = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    let consulta = client.data.RutaproSavedDocumentChunk
      .select(['id', 'revision', 'segmento', 'texto'])
      .where({ revision: { eq: meta.revision } })
      .orderBy({ segmento: 'asc' }).first(200);
    if (cursor) consulta = consulta.after(cursor);
    const pagina = await consulta.executePaginated();
    filas.push(...pagina.items);

    if (filas.length > meta.fragmentos)
      throw new DocumentoError('El documento contiene fragmentos repetidos.');
    if (!pagina.hasNextPage) break;

    const siguiente = pagina.endCursor;
    if (!siguiente || cursores.has(siguiente))
      throw new DocumentoError('No se pudo completar la lectura del documento.');
    cursores.add(siguiente);
    cursor = siguiente;
  }

  if (filas.some(r => r.revision !== meta.revision))
    throw new DocumentoError('Los fragmentos pertenecen a otra versión.');
  const texto = unirDocumento(filas, meta.fragmentos);
  if (texto.length !== meta.longitud ||
      await hashDocumento(texto) !== meta.sha256)
    throw new DocumentoError('El documento recibido está incompleto o alterado.');
  return texto;
}

export async function leerDocumento(
  tipo: unknown, nombre: unknown,
): Promise<string> {
  const meta = await buscarDocumento(await claveDocumento(tipo, nombre));
  if (!meta) return '';
  if (!Number.isSafeInteger(meta.fragmentos) || meta.fragmentos < 1 ||
      !Number.isSafeInteger(meta.longitud) || meta.longitud < 1)
    throw new DocumentoError('El registro del documento no es válido.');
  return leerFragmentos(meta);
}

export async function guardarDocumento(
  tipo: unknown, nombre: unknown, contenido: string,
): Promise<string> {
  const llave = await claveDocumento(tipo, nombre);
  const texto = limpiarDocumento(contenido);
  const client = await getRayfinClient();
  const anterior = await buscarDocumento(llave);

  if (!texto) {
    if (anterior) await client.data.RutaproSavedDocument.delete({ id: anterior.id });
    return '';
  }

  const revision = crypto.randomUUID();
  const fragmentos = fragmentarDocumento(texto);
  const guardados: string[] = [];

  for (let segmento = 0; segmento < fragmentos.length; segmento++) {
    const fila = await client.data.RutaproSavedDocumentChunk.create({
      revision, segmento, texto: fragmentos[segmento],
    });
    if (typeof fila.texto !== 'string' || !fila.texto.length)
      throw new DocumentoError('No se pudo guardar el texto del documento.');
    guardados.push(fila.texto);
  }

  // Usa los valores devueltos por el servicio.
  // Solo publica la nueva referencia cuando todos los fragmentos están guardados.
  const textoGuardado = guardados.join('');
  const valores = {
    revision, fragmentos: guardados.length,
    longitud: textoGuardado.length,
    sha256: await hashDocumento(textoGuardado),
    actualizada: new Date(),
  };

  if (anterior)
    await client.data.RutaproSavedDocument.update({ id: anterior.id }, valores);
  else
    await client.data.RutaproSavedDocument.create({
      llave, tipo: String(tipo), creada: new Date(), ...valores,
    });

  return textoGuardado;
}

export async function listarDocumentos(tipo: 'preset' | 'historial'): Promise<string[]> {
  const client = await getRayfinClient();
  const resultados: string[] = [];
  const cursores = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    let consulta = client.data.RutaproSavedDocument
      .select(['id', 'llave', 'tipo', 'creada', 'revision',
        'fragmentos', 'longitud', 'sha256', 'actualizada'])
      .where({ tipo: { eq: tipo } })
      .orderBy({ creada: 'asc', id: 'asc' }).first(100);
    if (cursor) consulta = consulta.after(cursor);
    const pagina = await consulta.executePaginated();

    for (const meta of pagina.items) {
      if (meta.tipo !== tipo ||
          !Number.isSafeInteger(meta.fragmentos) || meta.fragmentos < 1)
        throw new DocumentoError('El registro del escenario no es válido.');
      resultados.push(await leerFragmentos(meta));
    }
    if (!pagina.hasNextPage) break;
    const siguiente = pagina.endCursor;
    if (!siguiente || cursores.has(siguiente))
      throw new DocumentoError('No se pudo completar la lista de escenarios.');
    cursores.add(siguiente);
    cursor = siguiente;
  }
  return resultados;
}
