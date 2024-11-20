import type { Splittable, Text, Texts } from "@/types";

export class SentenceSplitter implements Splittable {
  constructor(
    private readonly cleanup: boolean = true,
  ) {}

  split(node: Text): Texts {
    const chunks = node.split(/[.!?;\n\t]/g); // regex needs to be refined
    return this.cleanup ? chunks.map((q) => q.trim()).filter(Boolean) : chunks;
  }
}
