import { ExtractorOllama } from "./ExtractorOllama.ts";

export class KeywordExtractorOllama extends ExtractorOllama {
  constructor(keywordCount: number = 5, model: string = "llama3.2") {
    super(
      model,
      (node) =>
        `You are an expert in keyword extraction from texts! Please extract ${keywordCount} unique keywords from the following paragraph: "${node}". The answer must only contain the list of the keywords. Format it as a comma-separated list (like "word1, word2, word3, word4, word5"). Do not hallucinate. Only extract ${keywordCount} keywords, no more no less. Focus on the most important keywords. Do not add any other & unnecessary information to the response!`,
    );
  }
}
