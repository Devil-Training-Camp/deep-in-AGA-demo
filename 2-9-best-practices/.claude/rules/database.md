# 数据库操作规范

## ORM
- 用 Prisma，不直接写 SQL
- schema 文件：`prisma/schema.prisma`
- migration 用 `prisma migrate dev`，不手动改数据库

## 查询
- 不在路由 handler 里直接调 `prisma.xxx`，封装到 `src/repositories/` 目录
- 需要事务的操作用 `prisma.$transaction()`

## 安全
- 禁止拼接 SQL 字符串（即使通过 Prisma `$queryRaw`）
- 用户输入必须先经过 Zod 校验再落库
- 敏感字段（密码）存储前必须 bcrypt hash

## 禁止操作
- 禁止 `DROP TABLE`（即使在迁移脚本里，先确认再执行）
- 禁止 `DELETE FROM` 不带 WHERE 条件
