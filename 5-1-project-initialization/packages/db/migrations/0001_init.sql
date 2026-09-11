-- 0001_init —— 向量方案前置地基
--
-- 骨架阶段只启用 pgvector 扩展。这是整个向量检索方案的前提,必须尽早在
-- Railway 托管的 PostgreSQL 14 上实测能否执行(CLAUDE.md「开发前需拍板」:
-- Railway PG 是否支持 CREATE EXTENSION vector)。
--
-- 6 张业务表(users / knowledge_bases / documents / doc_chunks /
-- conversations / messages)及其 HNSW / btree 索引的完整 DDL,留到后续
-- 数据模型章节落地,不在初始化骨架里写死——CHUNK_SIZE 等分块参数须在有
-- 数据入库前定稿,建表时机同理。

CREATE EXTENSION IF NOT EXISTS vector;
