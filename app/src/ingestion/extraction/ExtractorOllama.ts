import ollama from "ollama";
import type { Extractable, PromptTemplate, Text, Texts } from "@/types";

export class ExtractorOllama implements Extractable {
  constructor(
    private readonly model: string,
    private readonly template: PromptTemplate,
  ) {}

  protected async _extract(node: Text): Promise<Text> {
    const res = await ollama.generate({
      model: this.model,
      prompt: this.template(node),
    });
    return res.response;
  }

  async extract(node: Text): Promise<Texts> {
    return [await this._extract(node)];
  }
}
