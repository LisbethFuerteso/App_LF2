import { entity, date, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproGeometryChunk extends Source({
  schema: 'dbo', table: 'rutapro_geometry_fragmentos', primaryKey: [],
}) {
  @text({ optional: true, column: 'Hacienda', max: 8000 })
  hacienda?: string;
  @text({ optional: true, column: 'Suerte', max: 8000 })
  suerte?: string;
  @int({ optional: true, column: 'segmento' })
  segmento?: number;
  @int({ optional: true, column: 'total_segmentos' })
  totalSegmentos?: number;
  @int({ optional: true, column: 'geometry_longitud' })
  geometryLongitud?: number;
  @text({ optional: true, column: 'geometry_sha256', max: 64 })
  geometrySha256?: string;
  @int({ optional: true, column: 'geometry_srid' })
  geometrySrid?: number;
  @text({ optional: true, column: 'geometry_fragmento', max: 4000 })
  geometryFragmento?: string;
  @text({ optional: true, column: '_id_ejecucion', max: 8000 })
  idEjecucion?: string;
  @date({ optional: true, column: '_fecha_corte' })
  fechaCorte?: Date;
  @date({ optional: true, column: '_publicado_utc' })
  publicadoUtc?: Date;
}
