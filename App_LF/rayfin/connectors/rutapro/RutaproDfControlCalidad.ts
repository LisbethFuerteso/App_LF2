import { entity, date, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDfControlCalidad extends Source({"schema":"dbo","table":"rutapro_df_control_calidad","primaryKey":[]}) {
  @text({"optional":true,"max":8000})
  modulo?: string;
  @text({"optional":true,"max":8000})
  estado?: string;
  @int({"optional":true})
  filas?: number;
  @text({"optional":true,"max":8000})
  detalle?: string;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
