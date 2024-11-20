import ollama from "ollama";
import type { Embeddable, Matrix, Texts } from "@/types";

export class EmbeddingsOllama implements Embeddable {
  constructor(private readonly model: string) {}

  async embed(
    input: Texts,
  ): Promise<Matrix> {
    return (await ollama.embed({
      model: this.model,
      input: input as string[],
    })).embeddings;
  }
}
