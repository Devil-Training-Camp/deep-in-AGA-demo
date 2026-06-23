/**
 * Schema 汇总入口。数据结构按职责拆到 `schema/` 下,这里统一再导出,
 * 让外部(含 /gen-script Skill)用 `src/schema` 这一稳定路径引用 ScriptSchema 等。
 */
export * from "./schema/scene";
export * from "./schema/state";
