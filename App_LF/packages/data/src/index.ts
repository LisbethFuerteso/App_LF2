import { RutaproComment } from './RutaproComment.js';
import { RutaproCommentChunk } from './RutaproCommentChunk.js';

export type { UniversalAppSchema } from '@rayfin-app/shared';
export { RutaproComment, RutaproCommentChunk };

export const schema = [RutaproComment, RutaproCommentChunk];
