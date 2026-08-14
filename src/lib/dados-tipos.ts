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
  agendamentos: number;
};
