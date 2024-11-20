import type { Splittable, Text, Texts } from "@/types";

// TODO
//  - this should be the underlying class of all Text Splitters
//  - add remove whitespace, jump to next word, etc. -options
//  - add recursive chunking
//
// TODO
//  - move this to a general character splitter
//  - do a new and actual recursive character text splitter
export class RecursiveCharacterSplitter implements Splittable {
  constructor(
    private readonly characters: number = 500,
    private readonly overlap: number = 100,
    private readonly cleanup: boolean = true,
  ) {}

  split(node: Text): Texts {
    const length = node.length;

    let start = 0;
    const texts: Array<string> = [];
    do {
      const baseEnd = start + this.characters;
      const spaceEnd = node.indexOf(" ", baseEnd);
      const safeEnd = spaceEnd > 0 ? spaceEnd : baseEnd;

      texts.push(node.slice(start, safeEnd < length ? safeEnd : length));

      const baseStart = safeEnd - this.overlap;
      if (baseStart > length) break;

      const spaceStart = node.lastIndexOf(" ", baseStart);
      start = spaceStart > 0 ? spaceStart : baseStart;
    } while (start < length);

    return this.cleanup
      ? texts.map((text) => text.replace(/[\n\t]/g, " ").trim())
      : texts;
  }
}
