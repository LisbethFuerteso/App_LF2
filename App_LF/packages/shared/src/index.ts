export interface RutaproCommentRecord {
  id: string;
  llave: string;
  revision: string;
  fragmentos: number;
  longitud: number;
  sha256: string;
  actualizada: Date;
}
export interface RutaproCommentChunkRecord {
  id: string;
  revision: string;
  segmento: number;
  texto: string;
}
export interface RutaproSavedDocumentRecord {
  id: string;
  llave: string;
  tipo: string;
  creada: Date;
  revision: string;
  fragmentos: number;
  longitud: number;
  sha256: string;
  actualizada: Date;
}
export interface RutaproSavedDocumentChunkRecord {
  id: string;
  revision: string;
  segmento: number;
  texto: string;
}

export type UniversalAppSchema = {
  RutaproComment: RutaproCommentRecord;
  RutaproCommentChunk: RutaproCommentChunkRecord;
  RutaproSavedDocument: RutaproSavedDocumentRecord;
  RutaproSavedDocumentChunk: RutaproSavedDocumentChunkRecord;
};
