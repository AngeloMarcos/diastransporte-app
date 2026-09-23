#!/usr/bin/env bash
# Backup diário dos Postgres rodando nesta VPS (Dias Transporte legado,
# car-fleet-co legado e o app fundido diastransporte-app) + dos volumes de
# fotos enviadas pelo admin (rotas, frota, conteúdo — não confundir com as
# fotos estáticas do bundle, essas já vão junto do próprio deploy). pg_dump
# direto no container via docker compose exec, formato custom comprimido
# (-Fc: mais compacto e restaura seletivamente com pg_restore, ao contrário
# de um .sql puro). Retenção: 14 dias.
#
# Achado revisando o pipeline de imagens: este script só cobria os dois
# bancos ANTIGOS — o banco do diastransporte-app (o app fundido, onde todo
# o trabalho da fusão está) nunca teve backup nenhum, e NENHUM dos três
# nunca fez backup do volume de uploads — só do Postgres. Se o disco da VPS
# falhasse, o banco voltaria mas toda foto de rota/veículo/conteúdo enviada
# pelo admin (não as do bundle, essas voltam com o próximo deploy) se
# perderia de vez, sem aviso.
#
# Instalação (uma vez, na VPS):
#   cp infra/backup-postgres.sh /home/deploy/backup-postgres.sh
#   chmod +x /home/deploy/backup-postgres.sh
#   sudo cp infra/systemd/backup-postgres.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now backup-postgres.timer
#
# Restaurar um backup de banco (exemplo, Dias Transporte):
#   gunzip -k dias-transporte-AAAA-MM-DD_HHMMSS.dump.gz
#   docker compose cp dias-transporte-AAAA-MM-DD_HHMMSS.dump db:/tmp/r.dump
#   docker compose exec db pg_restore -U dias_migration -d dias --clean --if-exists /tmp/r.dump
#
# Restaurar um backup de uploads (exemplo, diastransporte-app):
#   docker run --rm -v diastransporte-app_uploads:/data \
#     -v /home/deploy/backups:/backup:ro alpine \
#     sh -c 'rm -rf /data/* && tar xzf /backup/diastransporte-app-uploads-AAAA-MM-DD_HHMMSS.tar.gz -C /data'
set -euo pipefail

BACKUP_DIR="/home/deploy/backups"
RETENCAO_DIAS=14          # cópias diárias
RETENCAO_SEMANAL_DIAS=60  # uma cópia por semana (domingo)
RETENCAO_MENSAL_DIAS=200  # uma cópia por mês (dia 1)
DATA=$(date +%Y-%m-%d_%H%M%S)

# Só o usuário do servidor lê estes arquivos: têm dados de clientes e o .env com segredos.
umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

backup_db() {
  local projeto_dir="$1" servico_db="$2" usuario_db="$3" nome_db="$4" rotulo="$5"
  local destino="$BACKUP_DIR/${rotulo}-${DATA}.dump"
  # Stack aposentada (parada de propósito após a fusão): não é falha.
  if [ -z "$(cd "$projeto_dir" && docker compose ps -q --status running "$servico_db" 2>/dev/null)" ]; then
    echo "→ ${rotulo}: stack parada, pulando"
    return 0
  fi
  echo "→ ${rotulo}: pg_dump ${nome_db}"
  if (cd "$projeto_dir" && docker compose exec -T "$servico_db" \
        pg_dump -U "$usuario_db" -d "$nome_db" -Fc) > "$destino"; then
    gzip -f "$destino"
    echo "  ok: ${destino}.gz ($(du -h "${destino}.gz" | cut -f1))"
  else
    echo "  FALHOU: ${rotulo}" >&2
    rm -f "$destino"
    return 1
  fi
}

# Volume nomeado do Docker (não um caminho fixo no host) — copiado via um
# container Alpine descartável, montando o volume só leitura. Pula em
# silêncio se o volume não existir (ex.: car-fleet-co nunca teve um).
backup_uploads() {
  local volume="$1" rotulo="$2"
  local destino="${rotulo}-uploads-${DATA}.tar.gz"
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    echo "→ ${rotulo}: volume ${volume} não existe, pulando"
    return 0
  fi
  echo "→ ${rotulo}: tar do volume ${volume}"
  if docker run --rm -v "${volume}:/data:ro" -v "${BACKUP_DIR}:/backup" alpine \
       tar czf "/backup/${destino}" -C /data .; then
    echo "  ok: ${BACKUP_DIR}/${destino} ($(du -h "${BACKUP_DIR}/${destino}" | cut -f1))"
  else
    echo "  FALHOU: ${rotulo} uploads" >&2
    rm -f "${BACKUP_DIR:?}/${destino}"
    return 1
  fi
}

# Sem o .env (senhas do banco, chave das sessões) não dá pra religar o app num servidor
# novo mesmo com o banco em mãos — por isso entra no backup diário.
backup_env() {
  local origem="/opt/diastransporte-app/.env"
  if [ ! -f "$origem" ]; then
    echo "→ .env não encontrado em $origem" >&2
    return 1
  fi
  cp "$origem" "$BACKUP_DIR/env-diastransporte-app-${DATA}.bak"
  echo "→ .env copiado"
}

falhou=0
backup_db /opt/dias-transporte db dias_migration dias dias-transporte || falhou=1
backup_db /opt/car-fleet-co db carfleet_migration carfleet car-fleet-co || falhou=1
backup_db /opt/diastransporte-app db diasapp_migration diasapp diastransporte-app || falhou=1

backup_uploads dias-transporte_uploads dias-transporte || falhou=1
backup_uploads diastransporte-app_uploads diastransporte-app || falhou=1
backup_env || falhou=1

# Cópias mais longas: uma por semana (domingo) e uma por mês (dia 1), pra poder voltar
# além dos 14 dias — um erro de dados descoberto tarde não fica sem saída.
guardar_copia() {
  local pasta="$1"
  mkdir -p "$BACKUP_DIR/$pasta"
  # Pega o dump, o tar de fotos e o .env desta rodada (todos levam ${DATA} no nome).
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "*diastransporte-app*${DATA}*" \
    -exec cp {} "$BACKUP_DIR/$pasta/" \;
  echo "→ cópia guardada em $pasta/"
}
if [ "$(date +%u)" = "7" ] || [ "${FORCAR_ROTACAO:-}" = "1" ]; then guardar_copia semanal; fi
if [ "$(date +%d)" = "01" ] || [ "${FORCAR_ROTACAO:-}" = "1" ]; then guardar_copia mensal; fi

echo "→ limpando backups com mais de ${RETENCAO_DIAS} dias"
find "$BACKUP_DIR" \( -name '*.dump.gz' -o -name '*-uploads-*.tar.gz' \) \
  -mtime "+${RETENCAO_DIAS}" -print -delete
find "$BACKUP_DIR/semanal" -type f -mtime "+${RETENCAO_SEMANAL_DIAS}" -print -delete 2>/dev/null || true
find "$BACKUP_DIR/mensal" -type f -mtime "+${RETENCAO_MENSAL_DIAS}" -print -delete 2>/dev/null || true
# .env antigos das cópias diárias (o find acima só cobre dump e uploads)
find "$BACKUP_DIR" -maxdepth 1 -name 'env-diastransporte-app-*.bak' -mtime "+${RETENCAO_DIAS}" -print -delete

# Registro do último resultado (uma linha), pra saber num relance se a noite passada deu certo.
if [ "$falhou" = "0" ]; then
  echo "ok $(date -Is)" > "$BACKUP_DIR/ULTIMO_BACKUP.txt"
else
  echo "FALHOU $(date -Is)" > "$BACKUP_DIR/ULTIMO_BACKUP.txt"
fi

exit "$falhou"
