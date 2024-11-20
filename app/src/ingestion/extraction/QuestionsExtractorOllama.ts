import type { Text, Texts } from "@/types";
import { ExtractorOllama } from "./ExtractorOllama.ts";

export class QuestionsExtractorOllama extends ExtractorOllama {
  constructor(count: number = 5, model: string = "llama3.2") {
    super(
      model,
      (node) =>
        `You are an expert in formulating user question about a given text! Please phrase ${count} questions about the following paragraph:

${node}

Your answer must only contain the questions, no additional text. The answer msut be formatted in a JSON format, with one "questions"-key which has a string array as value..
Keep the questions short, concise & in simple everyday language. The questions should be focused on the important parts of the text.
Do not hallucinate. Do not add any other & unnecessary information to the response!
Only come up with ${count} questions, no more no less.

Answer - examples:
{ questions: ["What is the meaning of life?", "What is the airspeed velocity of an unladen swallow?", "What is the capital of Assyria?", "What is the airspeed velocity of an unladen swallow?", "What is the capital of Assyria?"] }
`,
    );
  }

  override async extract(node: Text): Promise<Texts> {
    try {
      return JSON.parse(await super._extract(node)).questions as Texts;
    } catch {
      console.error("Failed to parse response");
      return [];
    }
  }
}
