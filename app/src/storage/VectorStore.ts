import type {
  Indexable,
  Ingestable,
  Persistable,
  Queryable,
  Retrievable,
  Storable,
} from "@/types";

export type DisposableVectorStore<T> = {
  store: T;
  [Symbol.asyncDispose]: () => Promise<void>;
};

export abstract class VectorStore<T = unknown>
  implements Storable, Retrievable, Ingestable {
  constructor(
    protected readonly client: T,
  ) {}
  abstract asPersiter(config?: unknown): Persistable;
  abstract asRetriever(config: unknown): Queryable;
  abstract asIngestionPipeline(
    transformation: unknown,
    embeddings: unknown,
  ): Indexable;
  abstract isConnected(): boolean;
  abstract disconnect(): Promise<void>;

  protected abstract createDatabase(database: string): Promise<void>;
  protected abstract loadDatabase(database: string): Promise<void>;
  protected abstract createCollection(
    config: Record<string, unknown>,
  ): Promise<void>;
  protected abstract loadCollection(collection: string): Promise<void>;
}
