import { entity, role, uuid, text, int, date } from '@microsoft/rayfin-core';

// Comentarios compartidos por los usuarios autenticados de la app,
// como el archivo de comentarios compartido del R.
@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'])
export class RutaproComment {
  @uuid() id!: string;
  @text({ max: 512, unique: true }) llave!: string;
  @uuid() revision!: string;
  @int() fragmentos!: number;
  @int() longitud!: number;
  @text({ max: 64 }) sha256!: string;
  @date() actualizada!: Date;
}
