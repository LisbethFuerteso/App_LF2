import { entity, date, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproContract extends Source({"schema":"dbo","table":"rutapro_contrato","primaryKey":[]}) {
  @text({"optional":true,"max":8000})
  objeto?: string;
  @text({"optional":true,"max":8000})
  tabla?: string;
  @int({"optional":true})
  filas?: number;
  @text({"optional":true,"column":"columnas_json","max":8000})
  columnasJson?: string;
  @text({"optional":true,"column":"tipos_json","max":8000})
  tiposJson?: string;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
