// /login não existe como tela — a entrada de verdade é /auth (login e
// cadastro na mesma página). Auditoria do site: quem digita/recebe o link
// "/login" caía num 404. Redireciona em vez de duplicar a tela.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
});
