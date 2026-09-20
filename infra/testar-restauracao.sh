#!/usr/bin/env bash
# Teste de restauração do backup do diastransporte-app — rodar na VPS, à mão,
# antes do corte de produção e de vez em quando depois (backup que nunca foi
# restaurado é só uma esperança).
#
# Faz dois testes, ambos num banco DESCARTÁVEL (o banco real nunca é tocado):
#   1. Ida e volta exata: gera um dump AGORA, restaura no banco de teste e exige
#      que a contagem de linhas de toda tabela bata com o banco vivo.
#   2. Arquivo da noite: restaura o dump gz mais recente de /home/deploy/backups
#      (o que o timer gerou) e confere que restaura sem erro e traz as tabelas.
# Também confere o tar de uploads mais recente (lista e conta arquivos).
#
# Uso (na VPS, com o arquivo copiado pra lá — NÃO via "ssh bash -s": o docker
# compose exec lê o stdin e engoliria o resto do script):
#   scp infra/testar-restauracao.sh deploy@VPS:/tmp/ && ssh deploy@VPS bash /tmp/testar-restauracao.sh
set -euo pipefail

PROJETO_DIR="/opt/diastransporte-app"
COMPOSE=(docker compose -f docker-compose.staging.yml)
BACKUP_DIR="/home/deploy/backups"
USUARIO="diasapp_migration"
BANCO="diasapp"
TESTE="restauracao_teste_$(date +%s)"

cd "$PROJETO_DIR"
psql_db() { "${COMPOSE[@]}" exec -T db psql -U "$USUARIO" -d "$1" -tA "${@:2}"; }
limpar() { psql_db postgres -c "DROP DATABASE IF EXISTS \"$TESTE\"" >/dev/null 2>&1 || true; }
trap limpar EXIT

# Contagem exata de linhas de todas as tabelas do schema public, "tabela|n".
contagens() {
  local banco="$1"
  local tabelas
  tabelas=$(psql_db "$banco" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1")
  for t in $tabelas; do
    echo "$t|$(psql_db "$banco" -c "SELECT count(*) FROM public.\"$t\"")"
  done
}

restaurar_em_teste() {
  local dump_no_container="$1"
  psql_db postgres -c "DROP DATABASE IF EXISTS \"$TESTE\"" >/dev/null
  psql_db postgres -c "CREATE DATABASE \"$TESTE\"" >/dev/null
  # Erros de "role does not exist" (dono dias_app) contam como aviso, não falha:
  # o que importa é que os dados voltem. Qualquer outro erro derruba o teste.
  "${COMPOSE[@]}" exec -T db pg_restore -U "$USUARIO" -d "$TESTE" --no-owner --no-privileges "$dump_no_container"
}

echo "== 1. Ida e volta exata (dump de agora → banco de teste)"
"${COMPOSE[@]}" exec -T db pg_dump -U "$USUARIO" -d "$BANCO" -Fc -f /tmp/agora.dump
restaurar_em_teste /tmp/agora.dump
contagens "$BANCO" > /tmp/contagem-vivo.txt
contagens "$TESTE" > /tmp/contagem-restaurado.txt
if diff -q /tmp/contagem-vivo.txt /tmp/contagem-restaurado.txt >/dev/null; then
  echo "  OK: $(wc -l < /tmp/contagem-vivo.txt) tabelas, contagens idênticas ao banco vivo"
else
  echo "  DIFERENÇA entre vivo e restaurado:" >&2
  diff /tmp/contagem-vivo.txt /tmp/contagem-restaurado.txt >&2 || true
  exit 1
fi
"${COMPOSE[@]}" exec -T db rm -f /tmp/agora.dump

echo "== 2. Arquivo da noite (o que o timer gerou)"
ULTIMO=$(ls -1t "$BACKUP_DIR"/diastransporte-app-2*.dump.gz | head -1)
echo "  arquivo: $ULTIMO ($(du -h "$ULTIMO" | cut -f1))"
gunzip -c "$ULTIMO" > /tmp/noite.dump
"${COMPOSE[@]}" cp /tmp/noite.dump db:/tmp/noite.dump
restaurar_em_teste /tmp/noite.dump
N_TABELAS=$(psql_db "$TESTE" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
N_USUARIOS=$(psql_db "$TESTE" -c "SELECT count(*) FROM public.usuarios")
N_ROTAS=$(psql_db "$TESTE" -c "SELECT count(*) FROM public.rotas")
echo "  OK: restaurou sem erro — $N_TABELAS tabelas, $N_USUARIOS usuário(s), $N_ROTAS rota(s)"
"${COMPOSE[@]}" exec -T db rm -f /tmp/noite.dump
rm -f /tmp/noite.dump

echo "== 3. Uploads (tar mais recente)"
TAR=$(ls -1t "$BACKUP_DIR"/diastransporte-app-uploads-*.tar.gz | head -1)
N_ARQ=$(tar tzf "$TAR" | grep -vc '/$' || true)
echo "  arquivo: $TAR — $N_ARQ arquivo(s) de foto no backup"
NO_VOLUME=$(docker run --rm -v diastransporte-app_uploads:/data:ro alpine sh -c 'find /data -type f | wc -l')
echo "  no volume agora: $NO_VOLUME arquivo(s)"

echo "== Concluído: banco de teste removido; nenhum dado real foi alterado."
