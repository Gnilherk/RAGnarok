import { EmbeddingsOllama } from "./EmbeddingsOllama.ts";

export class NomicEmbeddingsOllama extends EmbeddingsOllama {
  constructor() {
    super("nomic-embed-text");
  }
}
