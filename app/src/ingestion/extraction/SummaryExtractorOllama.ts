import { ExtractorOllama } from "./ExtractorOllama.ts";

export class SummaryExtractorOllama extends ExtractorOllama {
  constructor(model: string = "llama3.2") {
    super(
      model,
      (node) =>
        `You are an expert in the summarization of texts! Please summarize the following paragraph: "${node}". The answer must only contain the summary. Keep the summary short and concise. The summary must not be longer than two sentences. Only focus on important parts of the text. Use simple everyday language. Do not hallucinate. Do not add any other & unnecessary information to the response!`,
    );
  }
}
