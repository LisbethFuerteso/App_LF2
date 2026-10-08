import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

const mocks = vi.hoisted(() => ({
  select: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(),
  selectFragmentos: vi.fn(), crearFragmento: vi.fn(),
}));
vi.mock('./rayfin-client', () => ({
  getRayfinClient: async () => ({
    data: {
      RutaproComment: {
        select: mocks.select, create: mocks.crear,
        update: mocks.actualizar, delete: mocks.eliminar,
      },
      RutaproCommentChunk: {
        select: mocks.selectFragmentos, create: mocks.crearFragmento,
      },
    },
  }),
}));

import {
  claveComentario, limpiarComentario, fragmentarComentario,
  unirComentario, hashComentario, leerComentario, guardarComentario,
} from './comentarios-rutapro';

function pagina(items: unknown[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    first: vi.fn().mockReturnThis(),
    after: vi.fn().mockReturnThis(),
    executePaginated: vi.fn().mockResolvedValue({
      items, hasNextPage: false, endCursor: null,
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  mocks.select.mockReturnValue(pagina([]));
  mocks.crearFragmento.mockImplementation(async (input: { texto: string }) => ({
    texto: input.texto,
  }));
  mocks.crear.mockResolvedValue({ id: 'guardado' });
});
afterEach(() => vi.unstubAllGlobals());

describe('Comentarios del R con almacenamiento persistente', () => {
  it('conserva ceros iniciales y elimina espacios como trimws del R', () => {
    expect(claveComentario('010001', '001A')).toBe('["010001","001A"]');
    expect(limpiarComentario(' \n texto \t')).toBe('texto');
  });
  it('fragmenta comentarios largos sin dividir emojis', () => {
    const texto = 'a'.repeat(1999) + '🚛' + 'ñ'.repeat(5000);
    const filas = fragmentarComentario(texto);
    expect(filas.every(x => x.length <= 2000)).toBe(true);
    expect(filas.join('')).toBe(texto);
    expect(filas[0]).toBe('a'.repeat(1999));
    expect(filas[1].startsWith('🚛')).toBe(true);
  });
  it('rechaza fragmentos ausentes o repetidos', () => {
    expect(() => unirComentario([{ segmento: 0, texto: 'a' }], 2)).toThrow();
    expect(() => unirComentario([
      { segmento: 0, texto: 'a' }, { segmento: 0, texto: 'b' },
    ], 2)).toThrow();
  });
  it('muestra vacío cuando todavía no existe un comentario', async () => {
    expect(await leerComentario('010001', '001A')).toBe('');
  });
  it('reconstruye y comprueba un comentario guardado', async () => {
    const texto = 'uno dos';
    mocks.select.mockReturnValue(pagina([{
      id: 'a', revision: 'r', fragmentos: 2,
      longitud: texto.length, sha256: await hashComentario(texto),
    }]));
    mocks.selectFragmentos.mockReturnValue(pagina([
      { id: 'b', revision: 'r', segmento: 1, texto: 'dos' },
      { id: 'c', revision: 'r', segmento: 0, texto: 'uno ' },
    ]));
    expect(await leerComentario('010001', '001A')).toBe(texto);
  });
  it('publica la referencia después de guardar el texto', async () => {
    expect(await guardarComentario('010001', '001A', ' hola ')).toBe('hola');
    expect(mocks.crearFragmento).toHaveBeenCalledOnce();
    expect(mocks.crear).toHaveBeenCalledWith(expect.objectContaining({
      llave: '["010001","001A"]', fragmentos: 1, longitud: 4,
    }));
    expect(mocks.crearFragmento.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.crear.mock.invocationCallOrder[0]);
  });
  it('guardar vacío elimina el comentario actual', async () => {
    mocks.select.mockReturnValue(pagina([{ id: 'existente' }]));
    expect(await guardarComentario('010001', '001A', ' \n ')).toBe('');
    expect(mocks.eliminar).toHaveBeenCalledWith({ id: 'existente' });
    expect(mocks.crearFragmento).not.toHaveBeenCalled();
  });
  it('no reemplaza la referencia si falla el guardado de un fragmento', async () => {
    mocks.select.mockReturnValue(pagina([{ id: 'existente' }]));
    mocks.crearFragmento.mockRejectedValue(new Error('Fallo de escritura'));
    await expect(guardarComentario('010001', '001A', 'hola')).rejects.toThrow();
    expect(mocks.actualizar).not.toHaveBeenCalled();
    expect(mocks.crear).not.toHaveBeenCalled();
  });
});
