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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      apontamentos_custo: {
        Row: {
          categoria_id: string
          competencia: string
          created_at: string
          data_lancamento: string
          descricao: string
          fazenda_id: string | null
          id: string
          observacao: string | null
          safra_id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id: string
          competencia: string
          created_at?: string
          data_lancamento?: string
          descricao: string
          fazenda_id?: string | null
          id?: string
          observacao?: string | null
          safra_id: string
          user_id?: string
          valor: number
        }
        Update: {
          categoria_id?: string
          competencia?: string
          created_at?: string
          data_lancamento?: string
          descricao?: string
          fazenda_id?: string | null
          id?: string
          observacao?: string | null
          safra_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_custo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_custo_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_custo_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
        ]
      }
      baixas_cpv: {
        Row: {
          created_at: string
          custo_unitario_aplicado: number
          id: string
          quantidade: number
          safra_id: string
          user_id: string
          valor_cpv: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario_aplicado: number
          id?: string
          quantidade: number
          safra_id: string
          user_id?: string
          valor_cpv: number
          venda_id: string
        }
        Update: {
          created_at?: string
          custo_unitario_aplicado?: number
          id?: string
          quantidade?: number
          safra_id?: string
          user_id?: string
          valor_cpv?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baixas_cpv_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_cpv_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_custo: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
          user_id?: string
        }
        Relationships: []
      }
      colheitas: {
        Row: {
          created_at: string
          data_colheita: string
          id: string
          observacao: string | null
          quantidade_colhida: number
          safra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_colheita?: string
          id?: string
          observacao?: string | null
          quantidade_colhida: number
          safra_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data_colheita?: string
          id?: string
          observacao?: string | null
          quantidade_colhida?: number
          safra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colheitas_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
        ]
      }
      culturas: {
        Row: {
          created_at: string
          id: string
          nome: string
          unidade_medida: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          unidade_medida?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          unidade_medida?: string
          user_id?: string
        }
        Relationships: []
      }
      estoque_produto_acabado: {
        Row: {
          custo_unitario: number
          id: string
          quantidade_disponivel: number
          quantidade_total: number
          safra_id: string
          updated_at: string
          user_id: string
          valor_estoque: number
        }
        Insert: {
          custo_unitario?: number
          id?: string
          quantidade_disponivel?: number
          quantidade_total?: number
          safra_id: string
          updated_at?: string
          user_id?: string
          valor_estoque?: number
        }
        Update: {
          custo_unitario?: number
          id?: string
          quantidade_disponivel?: number
          quantidade_total?: number
          safra_id?: string
          updated_at?: string
          user_id?: string
          valor_estoque?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_produto_acabado_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: true
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
        ]
      }
      fazendas: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      safras: {
        Row: {
          area_hectares: number | null
          created_at: string
          cultura_id: string
          data_fim_colheita: string | null
          data_inicio: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["safra_status"]
          user_id: string
        }
        Insert: {
          area_hectares?: number | null
          created_at?: string
          cultura_id: string
          data_fim_colheita?: string | null
          data_inicio?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["safra_status"]
          user_id?: string
        }
        Update: {
          area_hectares?: number | null
          created_at?: string
          cultura_id?: string
          data_fim_colheita?: string | null
          data_inicio?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["safra_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safras_cultura_id_fkey"
            columns: ["cultura_id"]
            isOneToOne: false
            referencedRelation: "culturas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          comprador: string | null
          created_at: string
          data_venda: string
          despesas_comerciais: number
          id: string
          nota_fiscal: string | null
          preco_unitario_venda: number
          quantidade_vendida: number
          safra_id: string
          user_id: string
          valor_total_venda: number
        }
        Insert: {
          comprador?: string | null
          created_at?: string
          data_venda?: string
          despesas_comerciais?: number
          id?: string
          nota_fiscal?: string | null
          preco_unitario_venda: number
          quantidade_vendida: number
          safra_id: string
          user_id?: string
          valor_total_venda?: number
        }
        Update: {
          comprador?: string | null
          created_at?: string
          data_venda?: string
          despesas_comerciais?: number
          id?: string
          nota_fiscal?: string | null
          preco_unitario_venda?: number
          quantidade_vendida?: number
          safra_id?: string
          user_id?: string
          valor_total_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalcular_safra: { Args: { _safra_id: string }; Returns: undefined }
    }
    Enums: {
      categoria_tipo: "direto" | "indireto"
      safra_status: "em_formacao" | "colhida" | "encerrada"
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
      categoria_tipo: ["direto", "indireto"],
      safra_status: ["em_formacao", "colhida", "encerrada"],
    },
  },
} as const
