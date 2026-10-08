import { entity, date, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproVidWgs84 extends Source({"schema":"dbo","table":"rutapro_vid_wgs84","primaryKey":[]}) {
  @int({"optional":true,"column":"CODVIA"})
  codvia?: number;
  @text({"optional":true,"column":"NOMVIP","max":8000})
  nomvip?: string;
  @decimal({"optional":true,"column":"Shape_Leng"})
  shapeLeng?: number;
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
