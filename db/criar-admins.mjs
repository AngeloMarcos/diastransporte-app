#!/usr/bin/env node
// Cria (ou atualiza a senha de) os administradores no banco próprio.
//
//   DATABASE_URL=postgres://... ADMIN_SENHA_INICIAL='SenhaProvisoria@2026' node db/criar-admins.mjs
//
// Também aceita e-mails extras por argumento:
//   node db/criar-admins.mjs outro@dominio.com
import bcrypt from "bcryptjs";
import postgres from "postgres";

const PADRAO = [
  "mentoark@gmail.com",
  "angelobispofilho@gmail.com",
  "stefanocatedral@hotmail.com",
];

const url = process.env.DATABASE_URL;
const senha = process.env.ADMIN_SENHA_INICIAL;
if (!url || !senha) {
  console.error("Defina DATABASE_URL e ADMIN_SENHA_INICIAL.");
  process.exit(1);
}
if (senha.length < 8) {
  console.error("Use uma senha inicial com pelo menos 8 caracteres.");
  process.exit(1);
}

const emails = [...new Set([...PADRAO, ...process.argv.slice(2)])];
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  const hash = await bcrypt.hash(senha, 12);
  for (const email of emails) {
    const [linha] = await sql`
      INSERT INTO public.usuarios (email, senha_hash, admin)
      VALUES (${email}, ${hash}, true)
      ON CONFLICT (lower(email)) DO UPDATE
        SET senha_hash = ${hash}, admin = true, updated_at = now()
      RETURNING id, email
    `;
    // Sessões antigas deste usuário deixam de valer após a troca de senha.
    await sql`DELETE FROM public.sessoes WHERE user_id = ${linha.id}`;
    console.log(`admin pronto: ${linha.email}`);
  }
  console.log("\nTroque a senha de cada admin no primeiro acesso.");
} catch (erro) {
  console.error("Falha:", erro.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
