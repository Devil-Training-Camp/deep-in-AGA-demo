// PG 连接、迁移、pgvector 查询。实现委托给 @kb/db(复用 Railway PG,不引入新服务)。
// 三条相反的授权规则(知识库全员平权 / 历史强制拼 user_id / admin 刻意不拼)
// 统一在数据访问层处理,不在业务代码里手写(CLAUDE.md 安全 P0)。
export { getPool, getClient, query, closePool } from "@kb/db";
