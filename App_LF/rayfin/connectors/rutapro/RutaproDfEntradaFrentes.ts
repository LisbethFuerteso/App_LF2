import { entity, date, decimal, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDfEntradaFrentes extends Source({"schema":"dbo","table":"rutapro_df_entrada_frentes","primaryKey":[]}) {
  @text({"optional":true,"column":"Alce","max":8000})
  alce?: string;
  @decimal({"optional":true,"column":"Lat"})
  lat?: number;
  @decimal({"optional":true,"column":"Lng"})
  lng?: number;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
