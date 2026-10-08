import { entity, role, uuid, text, int, date } from '@microsoft/rayfin-core';

// Comentarios compartidos por los usuarios autenticados de la app,
// como el archivo de comentarios compartido del R.
@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'])
export class RutaproSavedDocument {
  @uuid() id!: string;
  @text({ max: 512, unique: true }) llave!: string;
  @text({ max: 16 }) tipo!: string;
  @date() creada!: Date;
  @uuid() revision!: string;
  @int() fragmentos!: number;
  @int() longitud!: number;
  @text({ max: 64 }) sha256!: string;
  @date() actualizada!: Date;
}
