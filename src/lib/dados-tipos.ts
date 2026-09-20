// Tipos compartilhados entre as duas infraestruturas (Lovable Cloud e VPS).
// Client-safe: só tipos, nenhum import de servidor.
export type AgendamentoRow = {
  id: string;
  user_id: string | null;
  rota_id: string;
  trecho: string;
  data_viagem: string | null;
  hora: string | null;
  periodo: string;
  carro: string;
  passageiros: number;
  valor: number | null;
  embarque_local: string | null;
  observacoes: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  status: string;
  motorista_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConteudoBloco = {
  id: string;
  chave: string;
  secao: string;
  titulo: string;
  texto: string;
  imagem: string;
  ordem: number;
};

/** Uma reserva enviada pelo cliente — sem `valor`: o preço é calculado no banco. */
export type NovaReserva = {
  rota_id: string;
  trecho: string;
  data_viagem: string | null;
  hora: string | null;
  periodo: "dia" | "noite";
  carro: "pequeno" | "grande";
  passageiros: number;
  embarque_local: string | null;
  observacoes: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
};

export type UsuarioAdmin = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  criadoEm: string;
  ultimoAcesso: string | null;
  confirmado: boolean;
  isAdmin: boolean;
  isMotorista: boolean;
  agendamentos: number;
};

// Frota: carros mostrados em "Nossa frota" e na home, e a galeria de fotos
// "na estrada" — hoje hardcoded (src/data/rotas.ts, src/routes/frota.tsx),
// virando dado editável pelo admin.
export type VeiculoFrotaRow = {
  id: string;
  nome: string;
  modelo: string;
  passageiros: string;
  bagagem: string;
  // Sprint 3: números e categoria — os textos acima (o que o site exibe) são
  // compostos a partir deles pelo servidor. Nulos só em veículo antigo.
  categoria: "pequeno" | "grande" | null;
  capacidade_passageiros: number | null;
  malas: number | null;
  placa: string | null;
  foto: string;
  itens: string[];
  ordem: number;
  ativo: boolean;
};

export type FotoGaleriaRow = {
  id: string;
  foto: string;
  alt: string;
  ordem: number;
  ativo: boolean;
};

// Linha da trilha de auditoria (public.auditoria, migration 0012) como a aba
// "Auditoria" do admin a consome. antes/depois guardam só os campos que mudaram.
// Valores que a trilha guarda por campo (escalares e lista de textos, ex.: galeria)
// — tipo fechado, e não unknown, pra atravessar a serialização das server functions.
export type ValorAuditoria = string | number | boolean | null | string[];

export type AuditoriaRow = {
  id: number;
  quando: string;
  usuario_email: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  resumo: string;
  antes: Record<string, ValorAuditoria> | null;
  depois: Record<string, ValorAuditoria> | null;
};
