# `migrations/` — 原生 SQL 迁移

`@kb/db` 的迁移脚本,由 `src/migrate.ts` 按文件名顺序执行,执行记录写入 `schema_migrations` 表,单文件事务化。

## 命名

`NNNN_描述.sql`,四位序号递增(如 `0001_init.sql`),保证执行顺序确定。

## 当前

- `0001_init.sql` — 骨架阶段只放 `CREATE EXTENSION IF NOT EXISTS vector;`(向量方案的前置地基,须尽早实测 Railway PG 是否支持)。

## 待补(后续数据模型章节)

6 张表的完整 DDL:`users`/`knowledge_bases`/`documents`/`doc_chunks`/`conversations`/`messages`,含 `doc_chunks.embedding vector(1024)` + HNSW 索引、`knowledge_base_id` btree 索引、历史两表的必备索引、级联删除(见 `architecture-design.md:181`)。

## 注意

- 不用 knex/Prisma——走原生 SQL(Prisma 不支持 `vector`)。
- 改分块参数(`CHUNK_SIZE` 等)需全量重建索引,与迁移无关但影响数据,须在有数据入库前定稿。
