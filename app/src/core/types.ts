/////// CORE

export type Maybe<T> = T | null;
export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export type Vector = ReadonlyArray<number>;
export type Matrix = ReadonlyArray<Vector>;
export type Text = string; // Stringable
export type Texts = ReadonlyArray<Text>;

/////// STORAGE

export interface Storable {
  asPersiter(config?: unknown): Persistable;
}

export interface Retrievable {
  asRetriever(config: unknown): Queryable;
}

export interface Ingestable {
  asIngestionPipeline(
    transformations: Transformations,
    embeddings: Embeddable,
  ): Indexable;
}

/////// INGESTION

export type Document = {
  _id?: UUID;
  filetype: "txt";
  filename: string;
  path: string;
  content: string;
};

export type Metadata = Record<string, Text>;
export type IngestionContext = Record<string, unknown>;
export type PromptTemplate = (node: Text) => string;

export type EmbeddedText = {
  _id: UUID;
  text: Text;
  embedding: Vector;
};

export type EmbeddedTexts = ReadonlyArray<EmbeddedText>;

export type PreEmbeddedText = {
  _id: UUID;
  text: Text;
  embedding: null;
};

type DocumentWithMetadata = Document & {
  metadata: Metadata;
};

export type BaseNode = {
  _id: UUID;
};

export type PreEmbeddedTextNode = BaseNode & DocumentWithMetadata & {
  embedded: ReadonlyArray<PreEmbeddedText>;
};

export type EmbeddedTextNode = BaseNode & DocumentWithMetadata & {
  embedded: EmbeddedTexts;
};

export type TextNode = PreEmbeddedTextNode | EmbeddedTextNode;

export interface Embeddable {
  embed(nodes: Texts, context?: IngestionContext): Promise<Matrix>;
}

export interface Indexable {
  from(documents: ReadonlyArray<Document>): Promise<IngestionResult>;
  index(document: Document): Promise<IngestionResult>;
  // persist(node: EmbeddedTextNode): Promise<PersistResult>;
  // ingest(document: Document): Promise<TextNode>;
  // embed(node: PreEmbeddedTextNode): Promise<EmbeddedTextNode>;
  // process(document: Document): Promise<PreEmbeddedTextNode>;
}

export interface Queryable {
  query(node: unknown): Promise<unknown>;
}

export interface Persistable {
  persist(node: TextNode): Promise<PersistResult>;
}

/** Pre Process document text - before text splitting */
export interface PreProcessable {
  preProcess(node: Text, context?: IngestionContext): Text | Promise<Text>;
}

/** Chunking document text - after pre-processing & before post-processing */
export interface Splittable {
  split(node: Text, context?: IngestionContext): Texts | Promise<Texts>;
}

/** Post Process chunks - after text splitting */
export interface PostProcessable {
  // should the post-processing of nodes run independently for each processer or should it be piped through all processors after another?
  postProcess(nodes: Texts, context?: IngestionContext): Texts | Promise<Texts>;
}

/** Extract relevant information from the pre-processed document */
export interface Extractable {
  extract(node: Text, context?: IngestionContext): Promise<Texts>;
}

/** Extract relevant metadata from the pre-processed document */
export interface MetadataExtractable {
  extract(
    node: Text,
    document: Document,
    context?: IngestionContext,
  ): Metadata | Promise<Metadata>;
}

export type Transformations = {
  preProcessors?: ReadonlyArray<PreProcessable>;
  splitters?: ReadonlyArray<Splittable>;
  postProcessors?: ReadonlyArray<PostProcessable>;
  extractors?: ReadonlyArray<Extractable>;
  metaExtractors?: ReadonlyArray<MetadataExtractable>;
};

export type PersistResult = {
  success: boolean;
};

export type IngestionResult = {
  success: boolean;
};
