import { ExtractorOllama } from "./ExtractorOllama.ts";

export class TitleExtractorOllama extends ExtractorOllama {
  constructor(model: string = "llama3.2") {
    super(
      model,
      (node) =>
        `You are an expert in the summarization of texts! Please provide a title for the following paragraph: "${node}". The answer must only contain the title. Keep the title short and concise. The title must not be longer than one sentences. Only focus on important parts of the text. Use simple everyday language. Do not hallucinate. Do not add any other & unnecessary information to the response!`,
    );
  }
}
