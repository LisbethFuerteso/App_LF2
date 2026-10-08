import { entity, role, uuid, text, int } from '@microsoft/rayfin-core';

// Fragmentos de una versión del comentario.
// La referencia del comentario se publica después de guardar sus fragmentos.
@entity()
@role('authenticated', ['create', 'read', 'delete'])
export class RutaproSavedDocumentChunk {
  @uuid() id!: string;
  @uuid() revision!: string;
  @int() segmento!: number;
  @text({ max: 4000 }) texto!: string;
}
