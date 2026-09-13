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
RETENCAO_DIAS=14
DATA=$(date +%Y-%m-%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

backup_db() {
  local projeto_dir="$1" servico_db="$2" usuario_db="$3" nome_db="$4" rotulo="$5"
  local destino="$BACKUP_DIR/${rotulo}-${DATA}.dump"
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

falhou=0
backup_db /opt/dias-transporte db dias_migration dias dias-transporte || falhou=1
backup_db /opt/car-fleet-co db carfleet_migration carfleet car-fleet-co || falhou=1
backup_db /opt/diastransporte-app db diasapp_migration diasapp diastransporte-app || falhou=1

backup_uploads dias-transporte_uploads dias-transporte || falhou=1
backup_uploads diastransporte-app_uploads diastransporte-app || falhou=1

echo "→ limpando backups com mais de ${RETENCAO_DIAS} dias"
find "$BACKUP_DIR" \( -name '*.dump.gz' -o -name '*-uploads-*.tar.gz' \) \
  -mtime "+${RETENCAO_DIAS}" -print -delete

exit "$falhou"
