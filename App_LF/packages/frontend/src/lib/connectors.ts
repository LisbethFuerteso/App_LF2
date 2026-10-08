import type { ConnectorConfig, ConnectorsRuntime } from '@microsoft/rayfin-connectors';
import { connectorConfig, type RutaproSchema } from '../../../../rayfin/connectors/rutapro/schema';
export type AppConnectorsSchema = { rutapro: RutaproSchema };
export const connectorConfigs = { rutapro: connectorConfig } satisfies Record<string, ConnectorConfig>;
export const connectorRuntimes: ConnectorsRuntime = {};
