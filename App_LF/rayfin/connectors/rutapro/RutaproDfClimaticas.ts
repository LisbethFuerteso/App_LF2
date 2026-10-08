import { entity, date, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDfClimaticas extends Source({"schema":"dbo","table":"rutapro_df_climaticas","primaryKey":[]}) {
  @text({"optional":true,"column":"Hacienda","max":8000})
  hacienda?: string;
  @text({"optional":true,"column":"Nombre","max":8000})
  nombre?: string;
  @text({"optional":true,"column":"Zona","max":8000})
  zona?: string;
  @int({"optional":true,"column":"Tenencia"})
  tenencia?: number;
  @text({"optional":true,"column":"Suerte","max":8000})
  suerte?: string;
  @decimal({"optional":true,"column":"Edad"})
  edad?: number;
  @text({"optional":true,"column":"Corte","max":8000})
  corte?: string;
  @decimal({"optional":true,"column":"Rad_0_360"})
  rad0360?: number;
  @decimal({"optional":true,"column":"Rad_hasta_hoy"})
  radHastaHoy?: number;
  @decimal({"optional":true,"column":"TMin_ultimos30"})
  tminUltimos30?: number;
  @decimal({"optional":true,"column":"GD_0_360"})
  gd0360?: number;
  @decimal({"optional":true,"column":"GD_hasta_hoy"})
  gdHastaHoy?: number;
  @decimal({"optional":true,"column":"Lat"})
  lat?: number;
  @decimal({"optional":true,"column":"Lng"})
  lng?: number;
  @date({"optional":true,"column":"Fecha_Ultima_Clima"})
  fechaUltimaClima?: Date;
  @decimal({"optional":true,"column":"Dias_Clima_ultimos30"})
  diasClimaUltimos30?: number;
  @text({"optional":true,"column":"Transitabilidad","max":8000})
  transitabilidad?: string;
  @text({"optional":true,"column":"Madurante","max":8000})
  madurante?: string;
  @decimal({"optional":true,"column":"SDAM"})
  sdam?: number;
  @decimal({"optional":true,"column":"TCH_aforo"})
  tchAforo?: number;
  @decimal({"optional":true,"column":"Ton_aforo"})
  tonAforo?: number;
  @decimal({"optional":true,"column":"TCH_pred_sin"})
  tchPredSin?: number;
  @decimal({"optional":true,"column":"Ton_pred_sin"})
  tonPredSin?: number;
  @decimal({"optional":true,"column":"Sacarosa_pred_sin"})
  sacarosaPredSin?: number;
  @decimal({"optional":true,"column":"Edad_hoy"})
  edadHoy?: number;
  @text({"optional":true,"column":"Prioridad","max":8000})
  prioridad?: string;
  @decimal({"optional":true,"column":"Probabilidad_incendio"})
  probabilidadIncendio?: number;
  @decimal({"optional":true,"column":"Edad_minima_incedio"})
  edadMinimaIncedio?: number;
  @decimal({"optional":true,"column":"Edad_maxima_incendio"})
  edadMaximaIncendio?: number;
  @decimal({"optional":true,"column":"TCH_pred"})
  tchPred?: number;
  @decimal({"optional":true,"column":"Ton_pred"})
  tonPred?: number;
  @decimal({"optional":true,"column":"Sacarosa_pred"})
  sacarosaPred?: number;
  @text({"optional":true,"column":"Mes_Cosecha","max":8000})
  mesCosecha?: string;
  @decimal({"optional":true,"column":"Lat_c"})
  latC?: number;
  @decimal({"optional":true,"column":"Lng_c"})
  lngC?: number;
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
