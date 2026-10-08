import { entity, date, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDfPendientes extends Source({"schema":"dbo","table":"rutapro_df_pendientes","primaryKey":[]}) {
  @text({"optional":true,"max":8000})
  modulo?: string;
  @text({"optional":true,"max":8000})
  motivo?: string;
  @text({"optional":true,"column":"Hacienda","max":8000})
  hacienda?: string;
  @text({"optional":true,"column":"Suerte","max":8000})
  suerte?: string;
  @text({"optional":true,"column":"detalle_json","max":8000})
  detalleJson?: string;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
