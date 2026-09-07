export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      canais_venda: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias_veiculo: {
        Row: {
          ativo: boolean
          capacidade_passageiros: number | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_passageiros?: number | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_passageiros?: number | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas_clientes: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          email_contato: string | null
          id: string
          nome: string
          telefone_contato: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email_contato?: string | null
          id?: string
          nome: string
          telefone_contato?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email_contato?: string | null
          id?: string
          nome?: string
          telefone_contato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          categoria_veiculo_id: string | null
          cidade_atuacao: string
          created_at: string
          email: string | null
          id: string
          nome: string
          regiao_atuacao: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          categoria_veiculo_id?: string | null
          cidade_atuacao: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          regiao_atuacao?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          categoria_veiculo_id?: string | null
          cidade_atuacao?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          regiao_atuacao?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_categoria_veiculo_id_fkey"
            columns: ["categoria_veiculo_id"]
            isOneToOne: false
            referencedRelation: "categorias_veiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_notas_internas: {
        Row: {
          created_at: string
          fornecedor_id: string
          observacoes_internas: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          observacoes_internas?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
          observacoes_internas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_notas_internas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          canal_venda_id: string | null
          categoria_veiculo_id: string | null
          cidade_atendimento: string
          codigo_fornecedor_reserva: string | null
          codigo_reserva_canal: string | null
          created_at: string
          data_alteracao: string
          data_emissao: string
          data_hora_encontro: string
          direcao: Database["public"]["Enums"]["pedido_direcao"]
          empresa_cliente_id: string | null
          empresa_nome: string | null
          fornecedor_id: string | null
          hotel: string | null
          id: number
          numero_voo: string | null
          observacao_motorista: string | null
          passageiro_nome: string
          passageiro_telefone: string | null
          ponto_chegada: string | null
          ponto_partida: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          updated_at: string
        }
        Insert: {
          canal_venda_id?: string | null
          categoria_veiculo_id?: string | null
          cidade_atendimento: string
          codigo_fornecedor_reserva?: string | null
          codigo_reserva_canal?: string | null
          created_at?: string
          data_alteracao?: string
          data_emissao?: string
          data_hora_encontro: string
          direcao: Database["public"]["Enums"]["pedido_direcao"]
          empresa_cliente_id?: string | null
          empresa_nome?: string | null
          fornecedor_id?: string | null
          hotel?: string | null
          id?: number
          numero_voo?: string | null
          observacao_motorista?: string | null
          passageiro_nome: string
          passageiro_telefone?: string | null
          ponto_chegada?: string | null
          ponto_partida?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
        }
        Update: {
          canal_venda_id?: string | null
          categoria_veiculo_id?: string | null
          cidade_atendimento?: string
          codigo_fornecedor_reserva?: string | null
          codigo_reserva_canal?: string | null
          created_at?: string
          data_alteracao?: string
          data_emissao?: string
          data_hora_encontro?: string
          direcao?: Database["public"]["Enums"]["pedido_direcao"]
          empresa_cliente_id?: string | null
          empresa_nome?: string | null
          fornecedor_id?: string | null
          hotel?: string | null
          id?: number
          numero_voo?: string | null
          observacao_motorista?: string | null
          passageiro_nome?: string
          passageiro_telefone?: string | null
          ponto_chegada?: string | null
          ponto_partida?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_canal_venda_id_fkey"
            columns: ["canal_venda_id"]
            isOneToOne: false
            referencedRelation: "canais_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_categoria_veiculo_id_fkey"
            columns: ["categoria_veiculo_id"]
            isOneToOne: false
            referencedRelation: "categorias_veiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_empresa_cliente_id_fkey"
            columns: ["empresa_cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          id: string
          pedido_id: number
          status_anterior: Database["public"]["Enums"]["pedido_status"] | null
          status_novo: Database["public"]["Enums"]["pedido_status"]
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          id?: string
          pedido_id: number
          status_anterior?: Database["public"]["Enums"]["pedido_status"] | null
          status_novo: Database["public"]["Enums"]["pedido_status"]
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          id?: string
          pedido_id?: number
          status_anterior?: Database["public"]["Enums"]["pedido_status"] | null
          status_novo?: Database["public"]["Enums"]["pedido_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_notas_internas: {
        Row: {
          created_at: string
          observacoes_internas: string | null
          pedido_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          observacoes_internas?: string | null
          pedido_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          observacoes_internas?: string | null
          pedido_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_notas_internas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_atribuir_motorista: {
        Args: { _fornecedor_id: string; _pedido_id: number }
        Returns: {
          canal_venda_id: string | null
          categoria_veiculo_id: string | null
          cidade_atendimento: string
          codigo_fornecedor_reserva: string | null
          codigo_reserva_canal: string | null
          created_at: string
          data_alteracao: string
          data_emissao: string
          data_hora_encontro: string
          direcao: Database["public"]["Enums"]["pedido_direcao"]
          empresa_cliente_id: string | null
          empresa_nome: string | null
          fornecedor_id: string | null
          hotel: string | null
          id: number
          numero_voo: string | null
          observacao_motorista: string | null
          passageiro_nome: string
          passageiro_telefone: string | null
          ponto_chegada: string | null
          ponto_partida: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_transicionar_status: {
        Args: {
          _novo_status: Database["public"]["Enums"]["pedido_status"]
          _pedido_id: number
        }
        Returns: {
          canal_venda_id: string | null
          categoria_veiculo_id: string | null
          cidade_atendimento: string
          codigo_fornecedor_reserva: string | null
          codigo_reserva_canal: string | null
          created_at: string
          data_alteracao: string
          data_emissao: string
          data_hora_encontro: string
          direcao: Database["public"]["Enums"]["pedido_direcao"]
          empresa_cliente_id: string | null
          empresa_nome: string | null
          fornecedor_id: string | null
          hotel: string | null
          id: number
          numero_voo: string | null
          observacao_motorista: string | null
          passageiro_nome: string
          passageiro_telefone: string | null
          ponto_chegada: string | null
          ponto_partida: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "motorista"
      pedido_direcao: "IN" | "OUT"
      pedido_status:
        | "pendente_liberacao"
        | "venda_cancelada"
        | "liberada_rede"
        | "motorista_atribuido"
        | "aguardando_aceite_rede"
        | "aceita_motorista"
        | "em_atendimento"
        | "corrida_finalizada"
        | "no_show_driver"
        | "no_show_pax"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "motorista"],
      pedido_direcao: ["IN", "OUT"],
      pedido_status: [
        "pendente_liberacao",
        "venda_cancelada",
        "liberada_rede",
        "motorista_atribuido",
        "aguardando_aceite_rede",
        "aceita_motorista",
        "em_atendimento",
        "corrida_finalizada",
        "no_show_driver",
        "no_show_pax",
      ],
    },
  },
} as const
