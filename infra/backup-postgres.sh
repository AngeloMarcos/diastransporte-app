#!/usr/bin/env bash
# Backup diário dos dois Postgres (Dias Transporte + car-fleet-co) rodando
# nesta VPS. pg_dump direto no container via docker compose exec, formato
# custom comprimido (-Fc: mais compacto e restaura seletivamente com
# pg_restore, ao contrário de um .sql puro). Retenção: 14 dias.
#
# Instalação (uma vez, na VPS):
#   cp infra/backup-postgres.sh /home/deploy/backup-postgres.sh
#   chmod +x /home/deploy/backup-postgres.sh
#   sudo cp infra/systemd/backup-postgres.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now backup-postgres.timer
#
# Restaurar um backup (exemplo, Dias Transporte):
#   gunzip -k dias-transporte-AAAA-MM-DD_HHMMSS.dump.gz
#   docker compose cp dias-transporte-AAAA-MM-DD_HHMMSS.dump db:/tmp/r.dump
#   docker compose exec db pg_restore -U dias_migration -d dias --clean --if-exists /tmp/r.dump
set -euo pipefail

BACKUP_DIR="/home/deploy/backups"
RETENCAO_DIAS=14
DATA=$(date +%Y-%m-%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

backup_um() {
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

falhou=0
backup_um /opt/dias-transporte db dias_migration dias dias-transporte || falhou=1
backup_um /opt/car-fleet-co db carfleet_migration carfleet car-fleet-co || falhou=1

echo "→ limpando backups com mais de ${RETENCAO_DIAS} dias"
find "$BACKUP_DIR" -name '*.dump.gz' -mtime "+${RETENCAO_DIAS}" -print -delete

exit "$falhou"
