import { RutaproGeometryChunk } from './RutaproGeometryChunk.js';
export { RutaproGeometryChunk } from './RutaproGeometryChunk.js';
import type { GraphQLBackedConnector } from '@microsoft/rayfin-connector-fabric-graphql';
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';
import { RutaproPublicaciones } from './RutaproPublicaciones.js';
import { RutaproContract } from './RutaproContract.js';
import { RutaproDfPrograma } from './RutaproDfPrograma.js';
import { RutaproDfClimaticas } from './RutaproDfClimaticas.js';
import { RutaproDfEntradaFrentes } from './RutaproDfEntradaFrentes.js';
import { RutaproDataShapeWgs84 } from './RutaproDataShapeWgs84.js';
import { RutaproVidWgs84 } from './RutaproVidWgs84.js';
import { RutaproVipWgs84 } from './RutaproVipWgs84.js';
import { RutaproDfControlCalidad } from './RutaproDfControlCalidad.js';
import { RutaproDfPendientes } from './RutaproDfPendientes.js';
export { RutaproPublicaciones } from './RutaproPublicaciones.js';
export { RutaproContract } from './RutaproContract.js';
export { RutaproDfPrograma } from './RutaproDfPrograma.js';
export { RutaproDfClimaticas } from './RutaproDfClimaticas.js';
export { RutaproDfEntradaFrentes } from './RutaproDfEntradaFrentes.js';
export { RutaproDataShapeWgs84 } from './RutaproDataShapeWgs84.js';
export { RutaproVidWgs84 } from './RutaproVidWgs84.js';
export { RutaproVipWgs84 } from './RutaproVipWgs84.js';
export { RutaproDfControlCalidad } from './RutaproDfControlCalidad.js';
export { RutaproDfPendientes } from './RutaproDfPendientes.js';
export const connectorConfig = {
  connector: 'fabric-sqlanalytics', operations: ['read'],
  entities: { RutaproGeometryChunk, RutaproPublicaciones, RutaproContract, RutaproDfPrograma, RutaproDfClimaticas, RutaproDfEntradaFrentes, RutaproDataShapeWgs84, RutaproVidWgs84, RutaproVipWgs84, RutaproDfControlCalidad, RutaproDfPendientes },
} as const satisfies ConnectorConfig;
export type RutaproSchema = GraphQLBackedConnector<{ RutaproGeometryChunk: typeof RutaproGeometryChunk, RutaproPublicaciones: typeof RutaproPublicaciones; RutaproContract: typeof RutaproContract; RutaproDfPrograma: typeof RutaproDfPrograma; RutaproDfClimaticas: typeof RutaproDfClimaticas; RutaproDfEntradaFrentes: typeof RutaproDfEntradaFrentes; RutaproDataShapeWgs84: typeof RutaproDataShapeWgs84; RutaproVidWgs84: typeof RutaproVidWgs84; RutaproVipWgs84: typeof RutaproVipWgs84; RutaproDfControlCalidad: typeof RutaproDfControlCalidad; RutaproDfPendientes: typeof RutaproDfPendientes },
  typeof connectorConfig
>;
