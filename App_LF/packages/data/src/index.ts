import { RutaproSavedDocument } from './RutaproSavedDocument.js';
import { RutaproSavedDocumentChunk } from './RutaproSavedDocumentChunk.js';
import { RutaproComment } from './RutaproComment.js';
import { RutaproCommentChunk } from './RutaproCommentChunk.js';

export type { UniversalAppSchema } from '@rayfin-app/shared';
export { RutaproComment, RutaproCommentChunk };

export { RutaproSavedDocument, RutaproSavedDocumentChunk };
export const schema = [RutaproComment, RutaproCommentChunk,
  RutaproSavedDocument, RutaproSavedDocumentChunk];
