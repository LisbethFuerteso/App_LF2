import { entity, boolean, date, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class RutaproPublicaciones extends Source({"schema":"dbo","table":"rutapro_publicaciones","primaryKey":[]}) {
  @text({"optional":true,"max":8000})
  estado?: string;
  @text({"optional":true,"max":8000})
  perfil?: string;
  @text({"optional":true,"column":"version_backend","max":8000})
  versionBackend?: string;
  @int({"optional":true,"column":"tablas_esperadas"})
  tablasEsperadas?: number;
  @boolean({"optional":true,"column":"apto_operativo"})
  aptoOperativo?: boolean;
  @boolean({"optional":true,"column":"backend_completo"})
  backendCompleto?: boolean;
  @text({"optional":true,"column":"librerias_json","max":8000})
  libreriasJson?: string;
  @text({"optional":true,"column":"_id_ejecucion","max":8000})
  idEjecucion?: string;
  @date({"optional":true,"column":"_fecha_corte"})
  fechaCorte?: Date;
  @date({"optional":true,"column":"_publicado_utc"})
  publicadoUtc?: Date;
}
