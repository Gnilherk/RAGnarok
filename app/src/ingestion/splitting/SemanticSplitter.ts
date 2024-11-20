import type { Splittable, Text, Texts } from "@/types";

/** @deprecated - Implement */
export abstract class SemanticSplitter implements Splittable {
  abstract split(node: Text): Texts;
}
