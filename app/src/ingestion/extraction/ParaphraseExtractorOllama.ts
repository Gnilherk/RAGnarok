import { ExtractorOllama } from "./ExtractorOllama.ts";

export class ParaphraseExtractorOllama extends ExtractorOllama {
  constructor(model: string = "llama3.2") {
    super(
      model,
      (node) =>
        `You are an expert in paraphrasing texts! Please provide paraphrased version of the following paragraph: "${node}". The answer must only contain the paraphrased text. Use simple everyday language. Keep the text concise, remove new lines and tabs. Do not hallucinate. Do not add any other & unnecessary information to the response!`,
    );
  }
}
