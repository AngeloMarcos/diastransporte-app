// Pool Postgres do deploy próprio (VPS). Server-only: nunca importe do cliente.
// A connection string usada aqui é a da role de APP (CRUD). As migrations
// rodam com a role de DDL, via scripts em db/ (fora do runtime).
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
      // Postgres em rede interna do Docker não usa TLS; use ?sslmode=require na URL quando precisar.
      onnotice: () => {},
    });
  }
  return _sql;
}
