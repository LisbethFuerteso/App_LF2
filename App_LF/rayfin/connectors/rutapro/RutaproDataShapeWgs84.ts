import { entity, date, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDataShapeWgs84 extends Source({"schema":"dbo","table":"rutapro_data_shape_wgs84","primaryKey":[]}) {
  @text({"optional":true,"column":"Hacienda","max":8000})
  hacienda?: string;
  @text({"optional":true,"column":"Suerte","max":8000})
  suerte?: string;
  @text({"optional":true,"column":"geometry_wkt","max":8000})
  geometryWkt?: string;
  @text({"optional":true,"column":"geometry_geojson","max":8000})
  geometryGeojson?: string;
  @int({"optional":true,"column":"geometry_srid"})
  geometrySrid?: number;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
