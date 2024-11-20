/**
    META Question:
    Should we loop over the docs and call the splitter, transformer & extractor for each doc
    or should we call the splitter, transformer & extractor for all docs at once and loop within?
*/
import { distinct } from "@std/collections";
import type {
  Document,
  Embeddable,
  EmbeddedTextNode,
  Extractable,
  Indexable,
  IngestionContext,
  IngestionResult,
  Maybe,
  MetadataExtractable,
  Persistable,
  PersistResult,
  PostProcessable,
  PreEmbeddedTextNode,
  PreProcessable,
  Splittable,
  Storable,
  TextNode,
  Texts,
  Transformations,
} from "@/types";

/**
    Notes:
    - enable contextual transformers (anthropic like)
    - add possibility to add agents
*/

export class Ingestion implements Indexable {
  private readonly store?: Persistable;
  private readonly preProcessors: ReadonlyArray<PreProcessable>;
  private readonly splitters: ReadonlyArray<Splittable>;
  private readonly postProcessors: ReadonlyArray<PostProcessable>;
  private readonly extractors: ReadonlyArray<Extractable>;
  private readonly metaExtractors: ReadonlyArray<MetadataExtractable>;
  private readonly context: IngestionContext = {};

  constructor(
    transformations: Transformations = {},
    private readonly embeddings?: Embeddable,
    store?: Storable | Persistable,
  ) {
    if (store) this.store = "asPersiter" in store ? store.asPersiter() : store;
    this.preProcessors = transformations.preProcessors ?? [];
    this.splitters = transformations.splitters ?? [];
    this.postProcessors = transformations.postProcessors ?? [];
    this.extractors = transformations.extractors ?? [];
    this.metaExtractors = transformations.metaExtractors ?? [];
  }

  async from(
    documents: ReadonlyArray<Document>,
  ): Promise<IngestionResult> {
    // const success = [];
    // for await (const document of documents) {
    //   success.push(await this.index(document));
    // }
    // return {
    //   success: success.every((result) => result.success),
    // };
    return {
      success: (await Promise.all(
        documents.map((document) => this.index(document)),
      )).every((result) => result.success),
    };
  }

  async index(document: Document): Promise<IngestionResult> {
    if (!this.embeddings || !this.store) {
      throw new Error("No embeddings or no store provided");
    }
    const embed = await this.__embed(await this.__process(document));
    return (await this.__persist(embed!))!;
  }

  async persist(node: EmbeddedTextNode): Promise<PersistResult> {
    const persist = await this.__persist(node);
    if (!persist) throw new Error("Persistence failed - no store provided");
    return persist;
  }

  async ingest(document: Document): Promise<TextNode> {
    const preEmbed = await this.__process(document);
    return await this.__embed(preEmbed) ?? preEmbed;
  }

  async embed(node: PreEmbeddedTextNode): Promise<EmbeddedTextNode> {
    const embed = await this.__embed(node);
    if (!embed) throw new Error("Embedding failed - no embeddings provided");
    return embed;
  }

  async process(document: Document): Promise<PreEmbeddedTextNode> {
    return await this.__process(document);
  }

  ////////////////////////////////////////////////////////////////////////
  // PRIVATE
  ////////////////////////////////////////////////////////////////////////
  // IDEA - move the following to separate classes
  ////////////////////////////////////////////////////////////////////////

  private async __persist(
    node: EmbeddedTextNode,
  ): Promise<Maybe<PersistResult>> {
    if (!this.store) return null;
    return await this.store.persist(node);
  }

  private async __embed(
    { embedded, ...props }: PreEmbeddedTextNode,
  ): Promise<Maybe<EmbeddedTextNode>> {
    if (!this.embeddings) return null;
    return {
      ...props,
      embedded:
        (await this.embeddings.embed(embedded.map((e) => e.text), this.context))
          .map((e, i) => ({
            _id: embedded[i]!._id,
            text: embedded[i]!.text,
            embedding: e,
          })),
    };
  }

  private async __process(document: Document): Promise<PreEmbeddedTextNode> {
    const preProcessed = await this.preProcessors.reduce(
      async (res, pp) => pp.preProcess(await res, this.context),
      Promise.resolve(document.content),
    );

    const splitted: Texts = await Promise.all(
      this.splitters.map((s) => s.split(preProcessed, this.context)),
    ).then((x) => x.flat());

    const postProcessed = await this.postProcessors.reduce(
      async (res, pp) => pp.postProcess(await res, this.context),
      Promise.resolve(splitted.length ? splitted : [preProcessed]),
    );

    const extracted = Promise.all(this.extractors.reduce<Array<Promise<Texts>>>(
      (res, t) => {
        postProcessed.forEach((c) => res.push(t.extract(c, this.context)));
        return res;
      },
      [],
    )).then((x) => x.flat());

    console.log(
      "---------------> extracted",
      document.filename,
      await extracted,
    );

    const metadata = await Promise.all(
      this.metaExtractors.map((t) =>
        t.extract(preProcessed, document, this.context)
      ),
    ).then((x) => x.flat().reduce((res, m) => ({ ...res, ...m }), {}));

    return {
      ...document,
      _id: document._id ?? crypto.randomUUID(),
      metadata,
      embedded: distinct([...postProcessed, ...await extracted]).map((
        chunk,
      ) => ({ _id: crypto.randomUUID(), text: chunk, embedding: null })),
    };
  }
  ////////////////////////////////////////////////////////////////////////
}
