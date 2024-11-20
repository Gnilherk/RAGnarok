import {
  type ClientConfig,
  CONNECT_STATUS,
  type FieldType,
  MilvusClient,
  type RowData,
  type SearchSimpleReq,
} from "npm:@zilliz/milvus2-sdk-node";
import type {
  Embeddable,
  EmbeddedTextNode,
  Persistable,
  PersistResult,
  Queryable,
  Texts,
  Transformations,
} from "@/types";
import { Ingestion } from "@/ingestion";
import { type DisposableVectorStore, VectorStore } from "./VectorStore.ts";

////////////////////////////////////////////////////////////////////////////////////////////////
/////// TYPES

export {
  DataTypeStringEnum as MilvusFieldDataTypeEnum,
} from "npm:@zilliz/milvus2-sdk-node";

export type MilvusInternalCreateCollectionConfig = Parameters<
  MilvusClient["createCollection"]
>[0];

export interface MilvusCollectionIndexSchema {
  index_name: string;
  field_name: string;
  index_type: string;
  metric_type?: string;
  params?: { efConstruction: number; M: number };
}

export type MilvusFieldType = Omit<FieldType, "name"> & {
  is_embedding?: boolean;
  is_content?: boolean;
  is_metadata?: boolean;
  is_metadata_field?: boolean;
};

export type MilvusCollectionSchema<T> = {
  collection: string;
  fields: {
    [P in keyof T]: MilvusFieldType;
  };
  index: MilvusCollectionIndexSchema;
};

export type MilvusVectorStoreConfig<T> = {
  database: string;
  schema: MilvusCollectionSchema<T>;
};

type MilvusClientConfig = string | ClientConfig;

export type DisposableMilvusVectorStore<T> = DisposableVectorStore<
  MilvusVectorStore<T>
>;

////////////////////////////////////////////////////////////////////////////////////////////////
/////// CLASS

export class MilvusVectorStore<T> extends VectorStore<MilvusClient> {
  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Constructors
  private constructor(
    client: MilvusClient,
    private readonly database: string,
    private readonly schema: MilvusCollectionSchema<T>,
    private readonly collection: string = schema.collection,
  ) {
    super(client);
  }

  static async fromEnv<T>(
    schema: MilvusCollectionSchema<T>,
    config?: Omit<
      ClientConfig,
      "address" | "password" | "username" | "database" | "token"
    >,
  ): Promise<DisposableMilvusVectorStore<T>> {
    const address = Deno.env.get("MILVUS_CONFIG_ADDRESS");
    const database = Deno.env.get("MILVUS_CONFIG_DATABASE");
    const token = Deno.env.get("MILVUS_CONFIG_TOKEN");
    const username = Deno.env.get("MILVUS_CONFIG_USERNAME");
    const password = Deno.env.get("MILVUS_CONFIG_PASSWORD");

    if (!address) throw new Error("MILVUS_CONFIG_ADDRESS is required");
    if (!database) throw new Error("MILVUS_CONFIG_DATABASE is required");

    return await MilvusVectorStore.from(
      { address, password, username, token, ...config },
      { database, schema },
    );
  }

  static async from<T>(
    clientConfig: MilvusClientConfig,
    schema: MilvusVectorStoreConfig<T>,
  ): Promise<DisposableMilvusVectorStore<T>> {
    return await MilvusVectorStore.using(
      new MilvusClient(clientConfig),
      schema,
    );
  }

  static async using<T>(
    client: MilvusClient,
    { database, schema }: MilvusVectorStoreConfig<T>,
  ): Promise<DisposableMilvusVectorStore<T>> {
    await client.connectPromise;
    const store = await new MilvusVectorStore<T>(
      client,
      database,
      schema,
    ).init();
    return this.toDisposable(store);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Override public methods

  public override asPersiter(
    config?: MilvusPersisterConfig<T>,
  ): MilvusPersister<T> {
    return new MilvusPersister(this.client, this.schema, config);
  }

  public override asRetriever(
    config: MilvusRetrieverConfig,
  ): MilvusRetriever<T> {
    return new MilvusRetriever(this.client, this.schema, config);
  }

  public override asIngestionPipeline(
    embeddings: Embeddable,
    transformations?: Transformations,
  ): Ingestion {
    return new Ingestion(transformations, embeddings, this);
  }

  public override isConnected(): boolean {
    return this.client.connectStatus == CONNECT_STATUS.CONNECTED;
  }

  public override async disconnect() {
    console.log("disconnected: ", await this.client.closeConnection());
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Override protected methods

  protected override async createDatabase(): Promise<void> {
    if ((await this.client.listDatabases()).db_names.includes(this.database)) {
      return;
    }
    const result = await this.client.createDatabase({ db_name: this.database });
    if (result.error_code !== "Success") {
      throw new Error("Failed to create new db");
    }
  }

  protected override async loadDatabase(): Promise<void> {
    await this.client.useDatabase({ db_name: this.database });
  }

  protected override async loadCollection(): Promise<void> {
    await this.client.loadCollectionAsync({ collection_name: this.collection });
  }

  protected override async createCollection(): Promise<void> {
    const exists = await this.client.hasCollection({
      collection_name: this.collection,
    });
    if (exists.value) return;
    const result = await this.client.createCollection(
      this.toCreateCollectionConfig(),
    );

    if (result.error_code !== "Success") {
      throw new Error("Failed to create new collection");
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods

  private static toDisposable<T>(
    store: MilvusVectorStore<T>,
  ): DisposableMilvusVectorStore<T> {
    return {
      store,
      [Symbol.asyncDispose]: async () => {
        await store.disconnect();
      },
    };
  }

  private async init(): Promise<MilvusVectorStore<T>> {
    await this.createDatabase();
    await this.loadDatabase();
    await this.createCollection();
    await this.loadCollection();
    return this;
  }

  private toCreateCollectionConfig<T>(): MilvusInternalCreateCollectionConfig {
    // TODO: validate id, vector, content, index
    // check that only metadata or metadata_field is set
    const { collection, index, fields } = this.schema;
    return {
      collection_name: collection,
      index_params: index,
      fields: Object.entries<MilvusFieldType>(fields)
        .map(([name, value]) => ({ name, ...value })),
    };
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////
}

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

type MilvusPersisterConfig<T> = {
  toEntities(
    node: EmbeddedTextNode,
    schema: MilvusCollectionSchema<T>,
  ): Array<T>;
};

// IDEA - think about an overriding constructor to use MilvusPersister without MilvusVectorStore - schema must not be required
export class MilvusPersister<T> implements Persistable {
  constructor(
    private readonly client: MilvusClient,
    private readonly schema: MilvusCollectionSchema<T>,
    private readonly config?: MilvusPersisterConfig<T>,
  ) {}

  private _toEntities(
    node: EmbeddedTextNode,
    schema: MilvusCollectionSchema<T>,
  ): Array<T> {
    return node.embedded.map((embed) =>
      <T> Object.entries<MilvusFieldType>(schema.fields)
        .reduce(
          (res, [key, value]) => {
            if (value.is_primary_key) {
              return { ...res, [key]: crypto.randomUUID() };
            }
            if (value.is_embedding && value.dim) {
              return { ...res, [key]: embed.embedding };
            }
            if (value.is_content) return { ...res, [key]: embed.text };
            if (value.is_metadata) {
              return { ...res, [key]: { ...node.metadata } };
            }
            if (value.is_metadata_field) {
              return { ...res, [key]: node.metadata[key] };
            }

            const isMetadataField = key in node.metadata;
            if (isMetadataField) {
              return { ...res, [key]: node.metadata[key] };
            }
            return res;
          },
          {},
        )
    );
  }

  async persist(
    node: EmbeddedTextNode,
  ): Promise<PersistResult> {
    const data = this.config?.toEntities
      ? this.config?.toEntities(node, this.schema)
      : this._toEntities(node, this.schema);
    const res = await this.client.insert({
      collection_name: this.schema.collection,
      data: <RowData[]> data,
    });
    return {
      success: !!res.succ_index.length,
    };
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

type MilvusRetrieverConfig = {
  embedding: Embeddable;
};

// IDEA - think about an overriding constructor to use MilvusPersister without MilvusVectorStore - schema must not be required
export class MilvusRetriever<T> implements Queryable {
  constructor(
    private readonly client: MilvusClient,
    private readonly schema: MilvusCollectionSchema<T>,
    private readonly config: MilvusRetrieverConfig,
  ) {}

  private toSearchParams({ limit, ...params }: Partial<{
    ef: number;
    nprobe: number;
    limit: number;
    level: number;
    radius: number;
  }> = {}): Omit<SearchSimpleReq, "data" | "collection_name"> {
    const fields = Object.entries<MilvusFieldType>(this.schema.fields);
    return {
      limit: limit ?? 5,
      output_fields: [
        fields.find((x) => x[1].is_content)?.[0] ?? "content",
        fields.find((x) => x[1].is_metadata)?.[0] ?? "metadata",
      ],
      params,
    };
  }

  async query(
    input: Texts,
    params?: Partial<{
      ef: number;
      nprobe: number;
      limit: number;
      level: number;
      radius: number;
    }>,
    // TODO - add filters for hybrid search based on T ?
    // _filter?: {},
  ): Promise<unknown> { // TODO - define output type based on T
    const vectors = await this.config.embedding.embed(input);
    return await this.client.search({
      collection_name: this.schema.collection,
      data: vectors as number[][],
      ...this.toSearchParams(params),
    });
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
