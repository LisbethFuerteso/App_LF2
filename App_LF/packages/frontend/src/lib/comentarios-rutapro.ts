import { getRayfinClient } from './rayfin-client';
import type {
  RutaproCommentRecord, RutaproCommentChunkRecord,
} from '@rayfin-app/shared';

export class ComentarioError extends Error {}

export function claveComentario(hacienda: unknown, suerte: unknown): string {
  if (typeof hacienda !== 'string' || !hacienda ||
      typeof suerte !== 'string' || !suerte)
    throw new ComentarioError('La suerte no tiene una llave válida.');
  const llave = JSON.stringify([hacienda, suerte]);
  if (llave.length > 512)
    throw new ComentarioError('La llave Hacienda/Suerte supera el tamaño admitido.');
  return llave;
}

// Equivalente a los espacios que elimina trimws() por defecto en el R.
export const limpiarComentario = (texto: string) =>
  texto.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

export function fragmentarComentario(texto: string): string[] {
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

export function unirComentario(
  filas: readonly { segmento: number; texto: string }[],
  cantidad: number,
): string {
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 ||
      filas.length !== cantidad)
    throw new ComentarioError('El comentario está incompleto.');
  const ordenadas = [...filas].sort((a, b) => a.segmento - b.segmento);
  for (let i = 0; i < ordenadas.length; i++) {
    const fila = ordenadas[i];
    if (fila.segmento !== i || typeof fila.texto !== 'string' ||
        !fila.texto.length || fila.texto.length > 4000)
      throw new ComentarioError('Los fragmentos del comentario no son válidos.');
  }
  return ordenadas.map(r => r.texto).join('');
}

export async function hashComentario(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(texto),
  );
  return Array.from(new Uint8Array(hash))
    .map(n => n.toString(16).padStart(2, '0')).join('');
}

async function buscarComentario(llave: string) {
  const client = await getRayfinClient();
  const pagina = await client.data.RutaproComment
    .select(['id', 'llave', 'revision', 'fragmentos',
      'longitud', 'sha256', 'actualizada'])
    .where({ llave: { eq: llave } }).first(2).executePaginated();

  if (pagina.hasNextPage || pagina.items.length > 1)
    throw new ComentarioError('Hay comentarios repetidos para la misma suerte.');
  return pagina.items[0] ?? null;
}

async function leerFragmentos(meta: RutaproCommentRecord) {
  const client = await getRayfinClient();
  const filas: RutaproCommentChunkRecord[] = [];
  const cursores = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    let consulta = client.data.RutaproCommentChunk
      .select(['id', 'revision', 'segmento', 'texto'])
      .where({ revision: { eq: meta.revision } })
      .orderBy({ segmento: 'asc' }).first(200);
    if (cursor) consulta = consulta.after(cursor);
    const pagina = await consulta.executePaginated();
    filas.push(...pagina.items);

    if (filas.length > meta.fragmentos)
      throw new ComentarioError('El comentario contiene fragmentos repetidos.');
    if (!pagina.hasNextPage) break;

    const siguiente = pagina.endCursor;
    if (!siguiente || cursores.has(siguiente))
      throw new ComentarioError('No se pudo completar la lectura del comentario.');
    cursores.add(siguiente);
    cursor = siguiente;
  }

  if (filas.some(r => r.revision !== meta.revision))
    throw new ComentarioError('Los fragmentos pertenecen a otra versión.');
  const texto = unirComentario(filas, meta.fragmentos);
  if (texto.length !== meta.longitud ||
      await hashComentario(texto) !== meta.sha256)
    throw new ComentarioError('El comentario recibido está incompleto o alterado.');
  return texto;
}

export async function leerComentario(
  hacienda: unknown, suerte: unknown,
): Promise<string> {
  const meta = await buscarComentario(claveComentario(hacienda, suerte));
  if (!meta) return '';
  if (!Number.isSafeInteger(meta.fragmentos) || meta.fragmentos < 1 ||
      !Number.isSafeInteger(meta.longitud) || meta.longitud < 1)
    throw new ComentarioError('El registro del comentario no es válido.');
  return leerFragmentos(meta);
}

export async function guardarComentario(
  hacienda: unknown, suerte: unknown, contenido: string,
): Promise<string> {
  const llave = claveComentario(hacienda, suerte);
  const texto = limpiarComentario(contenido);
  const client = await getRayfinClient();
  const anterior = await buscarComentario(llave);

  if (!texto) {
    if (anterior) await client.data.RutaproComment.delete({ id: anterior.id });
    return '';
  }

  const revision = crypto.randomUUID();
  const fragmentos = fragmentarComentario(texto);
  const guardados: string[] = [];

  for (let segmento = 0; segmento < fragmentos.length; segmento++) {
    const fila = await client.data.RutaproCommentChunk.create({
      revision, segmento, texto: fragmentos[segmento],
    });
    if (typeof fila.texto !== 'string' || !fila.texto.length)
      throw new ComentarioError('No se pudo guardar el texto del comentario.');
    guardados.push(fila.texto);
  }

  // Usa los valores devueltos por el servicio.
  // Solo publica la nueva referencia cuando todos los fragmentos están guardados.
  const textoGuardado = guardados.join('');
  const valores = {
    revision, fragmentos: guardados.length,
    longitud: textoGuardado.length,
    sha256: await hashComentario(textoGuardado),
    actualizada: new Date(),
  };

  if (anterior)
    await client.data.RutaproComment.update({ id: anterior.id }, valores);
  else
    await client.data.RutaproComment.create({ llave, ...valores });

  return textoGuardado;
}
