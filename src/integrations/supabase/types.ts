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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assinatura: {
        Row: {
          created_at: string
          id: string
          inicio: string
          nome_plano: string
          pix_chave: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          id?: string
          inicio?: string
          nome_plano?: string
          pix_chave?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Update: {
          created_at?: string
          id?: string
          inicio?: string
          nome_plano?: string
          pix_chave?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
      assinatura_pagamentos: {
        Row: {
          assinatura_id: string
          created_at: string
          id: string
          metodo: string
          status: string
          valor: number
        }
        Insert: {
          assinatura_id: string
          created_at?: string
          id?: string
          metodo?: string
          status?: string
          valor: number
        }
        Update: {
          assinatura_id?: string
          created_at?: string
          id?: string
          metodo?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_pagamentos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinatura"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          codigo_interno: string
          cpf: string | null
          created_at: string
          created_by: string | null
          id: string
          limite_credito: number | null
          nome: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          codigo_interno?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          limite_credito?: number | null
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          codigo_interno?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          limite_credito?: number | null
          nome?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cobrancas: {
        Row: {
          cliente_id: string
          created_at: string
          enviado_por: string | null
          fiado_id: string | null
          id: string
          valor_cobrado: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          enviado_por?: string | null
          fiado_id?: string | null
          id?: string
          valor_cobrado: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          enviado_por?: string | null
          fiado_id?: string | null
          id?: string
          valor_cobrado?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_fiado_id_fkey"
            columns: ["fiado_id"]
            isOneToOne: false
            referencedRelation: "fiados"
            referencedColumns: ["id"]
          },
        ]
      }
      fiado_itens: {
        Row: {
          created_at: string
          fiado_id: string
          id: string
          produto: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          fiado_id: string
          id?: string
          produto: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          fiado_id?: string
          id?: string
          produto?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiado_itens_fiado_id_fkey"
            columns: ["fiado_id"]
            isOneToOne: false
            referencedRelation: "fiados"
            referencedColumns: ["id"]
          },
        ]
      }
      fiados: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          status: string
          updated_at: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          status?: string
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          estornado: boolean
          fiado_id: string
          id: string
          metodo: string
          observacao: string | null
          registrado_por: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          estornado?: boolean
          fiado_id: string
          id?: string
          metodo?: string
          observacao?: string | null
          registrado_por?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          estornado?: boolean
          fiado_id?: string
          id?: string
          metodo?: string
          observacao?: string | null
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_fiado_id_fkey"
            columns: ["fiado_id"]
            isOneToOne: false
            referencedRelation: "fiados"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string
          codigo_interno: string | null
          created_at: string
          descricao: string
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          marca: string | null
          movimenta_estoque: boolean | null
          preco_atacado: number | null
          preco_custo: number
          preco_venda: number
          qtd_minima_atacado: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string
          codigo_interno?: string | null
          created_at?: string
          descricao: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          marca?: string | null
          movimenta_estoque?: boolean | null
          preco_atacado?: number | null
          preco_custo?: number
          preco_venda?: number
          qtd_minima_atacado?: number | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string
          codigo_interno?: string | null
          created_at?: string
          descricao?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          marca?: string | null
          movimenta_estoque?: boolean | null
          preco_atacado?: number | null
          preco_custo?: number
          preco_venda?: number
          qtd_minima_atacado?: number | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          pin: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          pin?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          pin?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venda_itens: {
        Row: {
          codigo_barras: string | null
          created_at: string
          desconto: number
          descricao: string
          id: string
          produto_id: string | null
          quantidade: number
          unidade: string
          valor_total: number
          valor_unitario: number
          venda_id: string
        }
        Insert: {
          codigo_barras?: string | null
          created_at?: string
          desconto?: number
          descricao: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
          venda_id: string
        }
        Update: {
          codigo_barras?: string | null
          created_at?: string
          desconto?: number
          descricao?: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          desconto_total: number
          id: string
          metodo_pagamento: string
          numero_venda: number
          operador_id: string | null
          status: string
          subtotal: number
          tipo: string
          total: number
          troco: number
          valor_pago: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          desconto_total?: number
          id?: string
          metodo_pagamento?: string
          numero_venda?: number
          operador_id?: string | null
          status?: string
          subtotal?: number
          tipo?: string
          total?: number
          troco?: number
          valor_pago?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          desconto_total?: number
          id?: string
          metodo_pagamento?: string
          numero_venda?: number
          operador_id?: string | null
          status?: string
          subtotal?: number
          tipo?: string
          total?: number
          troco?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "funcionario"
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
      app_role: ["admin", "funcionario"],
    },
  },
} as const
