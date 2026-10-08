import { entity, boolean, date, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproDfPrograma extends Source({"schema":"dbo","table":"rutapro_df_programa","primaryKey":[]}) {
  @int({"optional":true,"column":"Ano"})
  ano?: number;
  @int({"optional":true,"column":"Mes"})
  mes?: number;
  @text({"optional":true,"column":"Zona","max":8000})
  zona?: string;
  @text({"optional":true,"column":"Hacienda","max":8000})
  hacienda?: string;
  @text({"optional":true,"column":"Nombre","max":8000})
  nombre?: string;
  @text({"optional":true,"column":"Suerte","max":8000})
  suerte?: string;
  @text({"optional":true,"column":"Tenencia","max":8000})
  tenencia?: string;
  @text({"optional":true,"column":"G_tenencia","max":8000})
  gTenencia?: string;
  @decimal({"optional":true,"column":"Area_Neta"})
  areaNeta?: number;
  @decimal({"optional":true})
  dist?: number;
  @text({"optional":true,"column":"Estado","max":8000})
  estado?: string;
  @text({"optional":true,"max":8000})
  cultivo?: string;
  @decimal({"optional":true,"column":"Lat"})
  lat?: number;
  @decimal({"optional":true,"column":"Lng"})
  lng?: number;
  @decimal({"optional":true,"column":"TCH_pred"})
  tchPred?: number;
  @decimal({"optional":true,"column":"Ton_pred"})
  tonPred?: number;
  @decimal({"optional":true,"column":"Sacarosa_pred"})
  sacarosaPred?: number;
  @date({"optional":true,"column":"Inicio_Presupuesto"})
  inicioPresupuesto?: Date;
  @date({"optional":true,"column":"Periodo_Presupuesto"})
  periodoPresupuesto?: Date;
  @decimal({"optional":true,"column":"Edad"})
  edad?: number;
  @text({"optional":true,"column":"Pluviometro","max":8000})
  pluviometro?: string;
  @date({"optional":true,"column":"F_ult_cos_siem"})
  fUltCosSiem?: Date;
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
  @date({"optional":true,"column":"Fecha_incendio"})
  fechaIncendio?: Date;
  @decimal({"optional":true,"column":"Vejez"})
  vejez?: number;
  @boolean({"optional":true,"column":"tiene_compromiso"})
  tieneCompromiso?: boolean;
  @boolean({"optional":true,"column":"tiene_robo"})
  tieneRobo?: boolean;
  @decimal({"optional":true,"column":"Precip_Ayer"})
  precipAyer?: number;
  @decimal({"optional":true,"column":"Precip_Ayer_Dias_Observados"})
  precipAyerDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_2dias_atras"})
  precip2diasAtras?: number;
  @decimal({"optional":true,"column":"Precip_2dias_atras_Dias_Observados"})
  precip2diasAtrasDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_3dias_atras"})
  precip3diasAtras?: number;
  @decimal({"optional":true,"column":"Precip_3dias_atras_Dias_Observados"})
  precip3diasAtrasDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_5dias_atras"})
  precip5diasAtras?: number;
  @decimal({"optional":true,"column":"Precip_5dias_atras_Dias_Observados"})
  precip5diasAtrasDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_Manana"})
  precipManana?: number;
  @decimal({"optional":true,"column":"Precip_Manana_Dias_Observados"})
  precipMananaDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_2dias_adelante"})
  precip2diasAdelante?: number;
  @decimal({"optional":true,"column":"Precip_2dias_adelante_Dias_Observados"})
  precip2diasAdelanteDiasObservados?: number;
  @decimal({"optional":true,"column":"Precip_3dias_adelante"})
  precip3diasAdelante?: number;
  @decimal({"optional":true,"column":"Precip_3dias_adelante_Dias_Observados"})
  precip3diasAdelanteDiasObservados?: number;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
