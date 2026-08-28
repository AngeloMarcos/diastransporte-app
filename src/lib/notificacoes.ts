// Aviso sonoro + notificação do navegador para o admin perceber novas
// solicitações de corrida sem depender do cliente enviar a mensagem no
// WhatsApp (o registro em `agendamentos` já é a fonte de verdade — isto aqui
// só chama atenção pra ele). Sem dependência externa: o "bip" é sintetizado
// via Web Audio API, e a notificação usa a Notification API do navegador.

export function tocarAlerta() {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const tocarTom = (freq: number, inicio: number, duracao: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.05);
    };

    tocarTom(880, 0, 0.15);
    tocarTom(1108, 0.16, 0.2);
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Áudio bloqueado (navegador exige interação do usuário antes) — ignora.
  }
}

export function suportaNotificacao(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoNotificacao(): NotificationPermission | null {
  return suportaNotificacao() ? Notification.permission : null;
}

export async function pedirPermissaoNotificacao(): Promise<NotificationPermission> {
  if (!suportaNotificacao()) return "denied";
  return Notification.requestPermission();
}

export function notificarNovaSolicitacao(titulo: string, detalhe: string) {
  if (!suportaNotificacao() || Notification.permission !== "granted") return;
  try {
    new Notification(titulo, { body: detalhe, tag: "dias-transporte-novo-agendamento" });
  } catch {
    // Alguns navegadores exigem Service Worker pra notificação; falhar em silêncio está OK.
  }
}
