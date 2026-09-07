import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | undefined;

export function sql() {
  if (!_sql) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL não configurada no servidor.");
    _sql = postgres(url, {
      max: Number(process.env["DATABASE_POOL_MAX"] ?? 10),
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }
  return _sql;
}
