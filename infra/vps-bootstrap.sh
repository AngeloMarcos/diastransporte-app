#!/usr/bin/env bash
# Bootstrap idempotente da VPS do Dias Transporte (Debian 13, Hostinger).
# Rodar como root, direto no Terminal web do painel ou via SSH já autenticado.
#
# Uso:
#   bash vps-bootstrap.sh keys      # autoriza as chaves SSH pro root
#   bash vps-bootstrap.sh deploy    # cria o usuário "deploy" com sudo + as mesmas chaves
#   bash vps-bootstrap.sh harden    # firewall (ufw) + fail2ban + atualizações automáticas
#   bash vps-bootstrap.sh lockdown  # desativa login root/senha por SSH — SÓ depois de
#                                   # confirmar que "ssh deploy@<host>" funciona!
#   bash vps-bootstrap.sh all       # roda keys + deploy + harden (NÃO roda lockdown sozinho)
#
# Cada etapa é idempotente: pode rodar de novo sem duplicar nada.

set -euo pipefail

CLAUDE_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA3kevkrqjwNc6zKnO6KCG6JXmXdjtrktbA3fwt7YL5x claude-code@dias-transporte-vps"
CI_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAzSVSRJy52idX8pddz2J6CZLlfeXcAVIWQ4B5aGLlZk github-actions@dias-transporte-vps"

authorize_keys_for() {
  local home_dir="$1"
  install -d -m 700 -o "$(stat -c '%U' "$home_dir")" -g "$(stat -c '%G' "$home_dir")" "$home_dir/.ssh"
  touch "$home_dir/.ssh/authorized_keys"
  for key in "$CLAUDE_KEY" "$CI_KEY"; do
    grep -qxF "$key" "$home_dir/.ssh/authorized_keys" || echo "$key" >>"$home_dir/.ssh/authorized_keys"
  done
  chmod 600 "$home_dir/.ssh/authorized_keys"
  chown "$(stat -c '%U:%G' "$home_dir")" "$home_dir/.ssh/authorized_keys"
  echo "Chaves autorizadas em $home_dir/.ssh/authorized_keys:"
  cat "$home_dir/.ssh/authorized_keys"
}

step_keys() {
  echo "==> Autorizando chaves para root"
  authorize_keys_for /root
}

step_deploy() {
  echo "==> Criando usuário deploy (sudo, sem senha configurada — só chave)"
  if ! id deploy &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
  fi
  authorize_keys_for /home/deploy
}

step_harden() {
  echo "==> Firewall (ufw)"
  apt-get update -qq
  apt-get install -y -qq ufw fail2ban unattended-upgrades
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable

  echo "==> fail2ban (proteção contra brute-force de SSH)"
  systemctl enable --now fail2ban

  echo "==> Atualizações de segurança automáticas"
  dpkg-reconfigure -f noninteractive unattended-upgrades

  echo "==> Concluído. Regras de firewall:"
  ufw status verbose
}

step_lockdown() {
  echo "!! Isso desativa login root e login por senha via SSH."
  echo "!! Confirme ANTES que 'ssh -i ~/.ssh/dias_transporte_claude deploy@<host>' funciona."
  read -rp "Digite 'sim' para confirmar: " confirmacao
  if [ "$confirmacao" != "sim" ]; then
    echo "Abortado."
    exit 1
  fi
  sed -i \
    -e 's/^#\?PermitRootLogin.*/PermitRootLogin no/' \
    -e 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' \
    /etc/ssh/sshd_config
  sshd -t
  systemctl reload sshd
  echo "Login root e por senha desativados."
}

case "${1:-}" in
  keys) step_keys ;;
  deploy) step_deploy ;;
  harden) step_harden ;;
  lockdown) step_lockdown ;;
  all)
    step_keys
    step_deploy
    step_harden
    echo
    echo "Etapas 'keys', 'deploy' e 'harden' concluídas."
    echo "Rode 'bash vps-bootstrap.sh lockdown' manualmente DEPOIS de confirmar o acesso"
    echo "via usuário deploy — não faz parte do 'all' de propósito."
    ;;
  *)
    echo "Uso: $0 {keys|deploy|harden|lockdown|all}"
    exit 1
    ;;
esac
