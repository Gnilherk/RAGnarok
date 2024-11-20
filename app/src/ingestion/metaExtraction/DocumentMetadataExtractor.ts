import type { Document, Metadata, MetadataExtractable } from "@/types";

export class DocumentMetadataExtractor implements MetadataExtractable {
  extract(_: unknown, document: Document): Metadata {
    return {
      filename: document.filename,
      path: document.path,
      filetype: document.filetype,
    };
  }
}
