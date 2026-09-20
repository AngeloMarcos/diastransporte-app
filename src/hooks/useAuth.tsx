import { useEffect, useState } from "react";

import { sair, sessaoAtual } from "@/lib/vps/sessao.functions";

/** Usuário logado, como as telas o enxergam (id, e-mail e dados de contato). */
export type UsuarioLogado = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
};

/**
 * Estado de login: a sessão vem do cookie HttpOnly (lido no servidor), então o
 * navegador só consulta "quem sou eu" — nunca guarda token.
 */
export function useAuth() {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMotorista, setIsMotorista] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    sessaoAtual()
      .then((sessao) => {
        if (!ativo) return;
        setUser(
          sessao
            ? {
                id: sessao.id,
                email: sessao.email,
                nome: sessao.nome,
                telefone: sessao.telefone,
              }
            : null,
        );
        setIsAdmin(Boolean(sessao?.admin));
        setIsMotorista(Boolean(sessao?.motorista));
      })
      .catch(() => {
        if (ativo) {
          setUser(null);
          setIsAdmin(false);
          setIsMotorista(false);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return { user, isAdmin, isMotorista, carregando };
}

/** Encerra a sessão (apaga o cookie e a linha em public.sessoes). */
export async function encerrarSessaoAtual() {
  await sair();
}
