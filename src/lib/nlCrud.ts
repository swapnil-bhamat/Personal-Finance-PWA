import * as use from "@tensorflow-models/universal-sentence-encoder";

type Schema = Record<string, Record<string, unknown>[]>;

export type ActionType = "create" | "read" | "update" | "delete";

export type ActionCandidate = {
  type: ActionType;
  collection: string;
  filter?: Record<string, unknown>;
  patch?: Record<string, unknown>;
  score?: number;
  humanReadable?: string;
  resolvedFrom?: { collection: string; field: string; value: unknown };
};

type ValueIndexEntry = {
  collection: string;
  rowIndex: number;
  field: string;
  valueText: string;
  embedding: Float32Array;
};

export class NLCrud {
  private model: use.UniversalSentenceEncoder | null = null;
  private embeddingsIndex: {
    key: string;
    collection: string;
    intent: ActionType;
    example: string;
    metadata?: Record<string, unknown>;
    embedding: Float32Array;
  }[] = [];
  private valueIndex: ValueIndexEntry[] = [];
  private schema: Schema = {};

  private async loadModel() {
    if (this.model) return this.model;

    const tf = await import("@tensorflow/tfjs");
    const use = await import("@tensorflow-models/universal-sentence-encoder");

    await tf.setBackend("webgl").catch(async () => {
      await tf.setBackend("cpu");
    });
    await tf.ready();

    this.model = await use.load();
    return this.model;
  }

  /** Load and index a normalized JSON schema (called once per dataset). */
  async loadSchema(schema: Schema) {
    this.schema = schema;
    await this.loadModel();
    await this.buildIndexFromSchemaAndData();
    return true;
  }

  // ---------------- Utility helpers ----------------

  private cosineSim(a: Float32Array, b: Float32Array): number {
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  private collectAllKeysForCollection(collection: string): string[] {
    const rows = (this.schema[collection] || []) as Record<string, unknown>[];
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }

  async embedText(text: string): Promise<Float32Array> {
    if (!this.model) await this.loadModel();
    const emb = await this.model!.embed([text]);
    const arr = (await emb.array()) as number[][];
    emb.dispose();
    return new Float32Array(arr[0]);
  }

  // ---------------- Index building ----------------

  /** Generate minimal example phrases per collection for intent mapping. */
  private generateExamplesForCollection(
    collection: string,
    rows: Record<string, unknown>[]
  ) {
    const keys = new Set<string>();
    rows
      .slice(0, 20)
      .forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    const keyArr = Array.from(keys);
    const examples: { intent: ActionType; text: string; metadata?: unknown }[] =
      [];

    examples.push({ intent: "read", text: `Show me all ${collection}` });
    examples.push({
      intent: "read",
      text: `List ${collection} where ${keyArr[0] || "id"} equals 1`,
    });
    examples.push({
      intent: "create",
      text: `Add a new ${collection} with ${keyArr[0] || "name"} 'test'`,
    });
    examples.push({
      intent: "update",
      text: `Update ${collection} where ${keyArr[0] || "id"} is 1 and set ${
        keyArr[1] || "name"
      } to 'X'`,
    });
    examples.push({
      intent: "delete",
      text: `Delete ${collection} with ${keyArr[0] || "id"} = 1`,
    });

    for (const r of rows.slice(0, 10)) {
      const idKey = Object.keys(r)[0];
      const idVal = (r as Record<string, unknown>)[idKey];
      examples.push({
        intent: "read",
        text: `Show ${collection} for ${idKey} ${idVal}`,
        metadata: { idKey, idVal },
      });
    }

    return examples;
  }

  private async buildValueIndexForCollection(
    collection: string,
    rows: Record<string, unknown>[]
  ) {
    if (!this.model) await this.loadModel();
    const model = this.model!;
    const valueTexts: string[] = [];
    const meta: { field: string; rowIndex: number; original: string }[] = [];

    rows.forEach((row, i) => {
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) continue;
        if (typeof v === "string" && v.trim().length > 0 && v.length < 120) {
          valueTexts.push(v);
          meta.push({ field: k, rowIndex: i, original: v });
        } else if (typeof v === "number" && String(v).length <= 12) {
          valueTexts.push(String(v));
          meta.push({ field: k, rowIndex: i, original: String(v) });
        }
      }
    });

    if (!valueTexts.length) return;

    const embeddingsTensor = await model.embed(valueTexts);
    const embeddings = (await embeddingsTensor.array()) as number[][];
    embeddingsTensor.dispose();

    for (let i = 0; i < valueTexts.length; i++) {
      this.valueIndex.push({
        collection,
        rowIndex: meta[i].rowIndex,
        field: meta[i].field,
        valueText: meta[i].original,
        embedding: new Float32Array(embeddings[i]),
      });
    }
  }

  async buildIndexFromSchemaAndData() {
    if (!this.model) await this.loadModel();
    const model = this.model!;
    this.embeddingsIndex = [];
    this.valueIndex = [];

    for (const collection of Object.keys(this.schema)) {
      const rows = this.schema[collection] || [];
      const examples = this.generateExamplesForCollection(collection, rows);
      const texts = examples.map((e) => e.text);
      if (texts.length > 0) {
        const emb = await model.embed(texts);
        const arr = (await emb.array()) as number[][];
        emb.dispose();
        arr.forEach((vec, i) =>
          this.embeddingsIndex.push({
            key: `${collection}::${i}`,
            collection,
            intent: examples[i].intent,
            example: texts[i],
            metadata: examples[i].metadata as
              | Record<string, unknown>
              | undefined,
            embedding: new Float32Array(vec),
          })
        );
      }
      await this.buildValueIndexForCollection(collection, rows);
    }
  }

  private async findValueMatches(nl: string, topK = 8) {
    if (!this.model) await this.loadModel();
    const qEmb = await this.embedText(nl);
    return this.valueIndex
      .map((v) => ({
        v,
        score: this.cosineSim(qEmb, v.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => {
        const exact = nl.toLowerCase().includes(s.v.valueText.toLowerCase());
        return { ...s, adjustedScore: s.score + (exact ? 0.25 : 0) };
      });
  }

  // ---------------- Query processing ----------------

  async proposeActions(nl: string, topK = 6): Promise<ActionCandidate[]> {
    const qEmb = await this.embedText(nl);

    const exampleScored = this.embeddingsIndex
      .map((e) => ({ e, score: this.cosineSim(qEmb, e.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const valueMatches = await this.findValueMatches(nl, 12);
    const candidates: ActionCandidate[] = [];

    for (const s of exampleScored) {
      const intent = s.e.intent;
      const coll = s.e.collection;
      const sameColl = valueMatches.filter((v) => v.v.collection === coll);
      const crossColl = valueMatches.filter((v) => v.v.collection !== coll);

      candidates.push({ type: intent, collection: coll, score: s.score });

      // same-collection matches
      for (const m of sameColl.slice(0, 3)) {
        candidates.push({
          type: intent,
          collection: coll,
          filter: { [m.v.field]: m.v.valueText },
          score: (s.score + m.adjustedScore) / 2,
          humanReadable: `${intent.toUpperCase()} ${coll} where ${
            m.v.field
          } = ${m.v.valueText}`,
          resolvedFrom: {
            collection: coll,
            field: m.v.field,
            value: m.v.valueText,
          },
        });
      }

      // foreign-key resolution
      const foreignKeys = this.collectAllKeysForCollection(coll).filter((k) =>
        /_?id$/i.test(k)
      );
      if (foreignKeys.length && crossColl.length) {
        for (const m of crossColl.slice(0, 4)) {
          const row = this.schema[m.v.collection]?.[m.v.rowIndex];
          if (!row) continue;
          const idField = ["id", `${m.v.collection}_id`, "_id"].find(
            (k) => k in row
          );
          if (!idField) continue;
          const idVal = (row as Record<string, unknown>)[idField];

          const fkCandidates = foreignKeys
            .filter((k) => {
              const norm = k.toLowerCase();
              const collName = m.v.collection.toLowerCase();
              return (
                norm.includes(collName) ||
                norm.includes(collName.replace(/s$/, "")) ||
                /holder|owner|user|person/.test(norm)
              );
            })
            .concat(foreignKeys);

          for (const fk of fkCandidates.slice(0, 2)) {
            candidates.push({
              type: intent,
              collection: coll,
              filter: { [fk]: idVal },
              score: (s.score + m.adjustedScore) / 2,
              humanReadable: `${intent.toUpperCase()} ${coll} where ${fk} = ${idVal} (resolved from ${
                m.v.collection
              }.${m.v.field}=${m.v.valueText})`,
              resolvedFrom: {
                collection: m.v.collection,
                field: m.v.field,
                value: m.v.valueText,
              },
            });
          }
        }
      }
    }

    const dedup = new Map<string, ActionCandidate>();
    for (const c of candidates) {
      const k = `${c.type}|${c.collection}|${JSON.stringify(c.filter || {})}`;
      if (!dedup.has(k) || (dedup.get(k)!.score || 0) < (c.score || 0)) {
        dedup.set(k, c);
      }
    }
    return Array.from(dedup.values()).sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
  }

  // ---------------- CRUD Execution ----------------

  private rowMatchesFilter(
    row: Record<string, unknown>,
    filter: Record<string, unknown>
  ) {
    return Object.keys(filter).every(
      (k) => String(row[k]) === String(filter[k])
    );
  }

  executeAction(action: ActionCandidate): unknown {
    const coll = action.collection;
    const rows = this.schema[coll];
    if (!rows) throw new Error("Unknown collection: " + coll);

    if (action.type === "read") {
      if (!action.filter) return rows;
      return rows.filter((r) => this.rowMatchesFilter(r, action.filter!));
    }

    if (action.type === "create") {
      const newRow = { ...(action.patch || {}) };
      if (rows.some((r) => "id" in r) && !("id" in newRow)) {
        const maxId = Math.max(...rows.map((r) => Number(r.id) || 0));
        (newRow as Record<string, unknown>).id = maxId + 1;
      }
      rows.push(newRow);
      return newRow;
    }

    if (action.type === "update") {
      if (!action.filter) throw new Error("Update needs filter.");
      const targets = rows.filter((r) =>
        this.rowMatchesFilter(r, action.filter!)
      );
      targets.forEach((r) => Object.assign(r, action.patch || {}));
      return targets;
    }

    if (action.type === "delete") {
      if (!action.filter) throw new Error("Delete needs filter.");
      const before = rows.length;
      this.schema[coll] = rows.filter(
        (r) => !this.rowMatchesFilter(r, action.filter!)
      );
      return { deleted: before - (this.schema[coll] as unknown[]).length };
    }

    return null;
  }

  async retrain() {
    await this.buildIndexFromSchemaAndData();
  }

  get currentSchema() {
    return this.schema;
  }
}
