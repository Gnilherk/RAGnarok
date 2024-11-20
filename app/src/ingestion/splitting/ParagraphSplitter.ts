import type { Splittable, Text, Texts } from "@/types";

export class ParagraphSplitter implements Splittable {
  constructor(
    private readonly cleanup: boolean = true,
    // TODO - add min-size for splitting - to avoid splitting on short paragraphs
  ) {}

  split(node: Text): Texts {
    const chunks = node.split(/\n\n/g);
    return this.cleanup ? chunks.map((q) => q.trim()).filter(Boolean) : chunks;
  }
}
