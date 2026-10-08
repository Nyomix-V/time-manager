import { FindOperator } from 'typeorm';

// In-memory stand-in for a TypeORM Repository, limited to what the services
// use (find/findOne/save/update/softDelete…). Lets the route tests run the
// real controllers, guards, pipes and services without a database.

type Row = Record<string, any>;
type Relation = { repo: FakeRepository<any>; key: string };
type Seed<T> = { [K in keyof T]?: T[K] | null };
type FindOptions = { where?: Row | Row[]; order?: Record<string, 'ASC' | 'DESC'>; relations?: Record<string, boolean> };

let sequence = 0;

export class FakeRepository<T extends Row> {
  rows: T[] = [];
  /** Relations that `relations: { name: true }` may load, e.g. { user: { repo: users, key: 'userId' } }. */
  relations: Record<string, Relation> = {};

  constructor(private readonly defaults: () => Partial<T> = () => ({})) {}

  seed(...rows: Seed<T>[]) {
    for (const row of rows) this.rows.push(this.withDefaults(row as Partial<T>));
    return this;
  }

  create(data: Partial<T>): T {
    return { ...data } as T;
  }

  async save(entity: T): Promise<T> {
    const existing = entity.id ? this.rows.find((r) => r.id === entity.id) : undefined;
    if (existing) Object.assign(existing, columnsOnly(entity));
    else {
      const row = this.withDefaults(columnsOnly(entity));
      this.rows.push(row);
      Object.assign(entity, row);
    }
    return entity;
  }

  async find(options: FindOptions = {}): Promise<T[]> {
    let rows = this.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.deletedAt && matchesAny(row, options.where ?? {}));
    if (options.order) rows = rows.sort(byOrder(options.order));
    return rows.map(({ row }) => this.withRelations({ ...row }, options.relations));
  }

  async findOne(options: FindOptions): Promise<T | null> {
    return (await this.find(options))[0] ?? null;
  }

  async update(criteria: string | Row, patch: Partial<T>) {
    const targets = this.rows.filter((r) => (typeof criteria === 'string' ? r.id === criteria : matches(r, criteria)));
    for (const row of targets) Object.assign(row, patch);
    return { affected: targets.length };
  }

  async softDelete(id: string) {
    return this.update(id, { deletedAt: new Date() } as unknown as Partial<T>);
  }

  async delete(id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    return { affected: before - this.rows.length };
  }

  private withDefaults(data: Partial<T>): T {
    sequence++;
    const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    return {
      id: `id-${sequence}`,
      createdAt: new Date(Date.UTC(2026, 0, 1) + sequence * 1000),
      ...this.defaults(),
      ...defined,
    } as unknown as T;
  }

  private withRelations(row: T, wanted?: Record<string, boolean>): T {
    for (const [name, on] of Object.entries(wanted ?? {})) {
      const relation = this.relations[name];
      if (!on || !relation) continue;
      const target = relation.repo.rows.find((r) => r.id === row[relation.key]);
      (row as Row)[name] = target ? { ...target } : null;
    }
    return row;
  }
}

/** Drops loaded relations (plain objects) before storing, like TypeORM keeps only columns. */
function columnsOnly<T extends Row>(entity: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(entity).filter(([, v]) => v === null || typeof v !== 'object' || v instanceof Date),
  ) as Partial<T>;
}

/** An array of conditions means OR, like TypeORM's `where: [{ ... }, { ... }]`. */
function matchesAny(row: Row, where: Row | Row[]): boolean {
  return Array.isArray(where) ? where.some((w) => matches(row, w)) : matches(row, where);
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true; // TypeORM ignores undefined conditions
    const actual = row[key];
    if (expected instanceof FindOperator) {
      const value = expected.value as any;
      switch (expected.type) {
        case 'between':
          return actual >= value[0] && actual <= value[1];
        case 'moreThanOrEqual':
          return actual >= value;
        case 'lessThanOrEqual':
          return actual <= value;
        default:
          throw new Error(`FakeRepository: unsupported operator ${expected.type}`);
      }
    }
    if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
    // MySQL's default collation compares text case-insensitively ("Emma@x.fr" = "emma@x.fr").
    if (typeof expected === 'string' && typeof actual === 'string') return actual.toLowerCase() === expected.toLowerCase();
    return (actual ?? null) === expected;
  });
}

// Equal values keep insertion order (the later row is the later event).
function byOrder(order: Record<string, 'ASC' | 'DESC'>) {
  return (a: { row: Row; index: number }, b: { row: Row; index: number }) => {
    for (const [key, direction] of Object.entries(order)) {
      const sign = direction === 'DESC' ? -1 : 1;
      const x = a.row[key];
      const y = b.row[key];
      if (x < y) return -sign;
      if (x > y) return sign;
    }
    const sign = Object.values(order)[0] === 'DESC' ? -1 : 1;
    return sign * (a.index - b.index);
  };
}
