import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Cultura = { id: string; nome: string; unidade_medida: string };
export type Categoria = { id: string; nome: string; tipo: "direto" | "indireto" };
export type Fazenda = { id: string; nome: string };
export type Safra = {
  id: string;
  cultura_id: string;
  nome: string;
  data_inicio: string;
  data_fim_colheita: string | null;
  status: "em_formacao" | "colhida" | "encerrada";
  area_hectares: number | null;
};
export type Apontamento = {
  id: string;
  safra_id: string;
  categoria_id: string;
  fazenda_id: string | null;
  competencia: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  observacao: string | null;
  origem_linha: number | null;
};
export type Colheita = {
  id: string;
  safra_id: string;
  data_colheita: string;
  quantidade_colhida: number;
  observacao: string | null;
};
export type Estoque = {
  id: string;
  safra_id: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  custo_unitario: number;
  valor_estoque: number;
};
export type Venda = {
  id: string;
  safra_id: string;
  data_venda: string;
  quantidade_vendida: number;
  preco_unitario_venda: number;
  valor_total_venda: number;
  despesas_comerciais: number;
  comprador: string | null;
  nota_fiscal: string | null;
};
export type BaixaCpv = {
  id: string;
  venda_id: string;
  safra_id: string;
  quantidade: number;
  custo_unitario_aplicado: number;
  valor_cpv: number;
};

async function tabela<T>(nome: string, order: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(nome as never)
    .select("*")
    .order(order, { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useDados() {
  const culturas = useQuery({
    queryKey: ["culturas"],
    queryFn: () => tabela<Cultura>("culturas", "nome"),
  });
  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: () => tabela<Categoria>("categorias_custo", "nome"),
  });
  const fazendas = useQuery({
    queryKey: ["fazendas"],
    queryFn: () => tabela<Fazenda>("fazendas", "nome"),
  });
  const safras = useQuery({
    queryKey: ["safras"],
    queryFn: () => tabela<Safra>("safras", "data_inicio"),
  });
  const apontamentos = useQuery({
    queryKey: ["apontamentos"],
    queryFn: () => tabela<Apontamento>("apontamentos_custo", "competencia"),
  });
  const colheitas = useQuery({
    queryKey: ["colheitas"],
    queryFn: () => tabela<Colheita>("colheitas", "data_colheita"),
  });
  const estoque = useQuery({
    queryKey: ["estoque"],
    queryFn: () => tabela<Estoque>("estoque_produto_acabado", "updated_at"),
  });
  const vendas = useQuery({
    queryKey: ["vendas"],
    queryFn: () => tabela<Venda>("vendas", "data_venda"),
  });
  const baixas = useQuery({
    queryKey: ["baixas"],
    queryFn: () => tabela<BaixaCpv>("baixas_cpv", "created_at"),
  });

  return {
    culturas: culturas.data ?? [],
    categorias: categorias.data ?? [],
    fazendas: fazendas.data ?? [],
    safras: safras.data ?? [],
    apontamentos: apontamentos.data ?? [],
    colheitas: colheitas.data ?? [],
    estoque: estoque.data ?? [],
    vendas: vendas.data ?? [],
    baixas: baixas.data ?? [],
    loading:
      culturas.isLoading ||
      safras.isLoading ||
      apontamentos.isLoading ||
      vendas.isLoading ||
      estoque.isLoading,
  };
}

export function useRecarregar() {
  const qc = useQueryClient();
  return () => {
    [
      "culturas",
      "categorias",
      "fazendas",
      "safras",
      "apontamentos",
      "colheitas",
      "estoque",
      "vendas",
      "baixas",
    ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

export type ResultadoSafra = {
  custoTotal: number;
  qtdColhida: number;
  custoUnitario: number;
  qtdDisponivel: number;
  valorEstoque: number;
  receita: number;
  cpv: number;
  margemBruta: number;
  despesasComerciais: number;
  resultado: number;
  qtdVendida: number;
};

export function calcularResultado(safraId: string, d: ReturnType<typeof useDados>): ResultadoSafra {
  const custoTotal = d.apontamentos
    .filter((a) => a.safra_id === safraId)
    .reduce((s, a) => s + Number(a.valor), 0);
  const qtdColhida = d.colheitas
    .filter((c) => c.safra_id === safraId)
    .reduce((s, c) => s + Number(c.quantidade_colhida), 0);
  const est = d.estoque.find((e) => e.safra_id === safraId);
  const vendasSafra = d.vendas.filter((v) => v.safra_id === safraId);
  const receita = vendasSafra.reduce((s, v) => s + Number(v.valor_total_venda), 0);
  const despesasComerciais = vendasSafra.reduce((s, v) => s + Number(v.despesas_comerciais), 0);
  const cpv = d.baixas
    .filter((b) => b.safra_id === safraId)
    .reduce((s, b) => s + Number(b.valor_cpv), 0);
  const qtdVendida = vendasSafra.reduce((s, v) => s + Number(v.quantidade_vendida), 0);

  return {
    custoTotal,
    qtdColhida,
    custoUnitario: qtdColhida > 0 ? custoTotal / qtdColhida : 0,
    qtdDisponivel: Number(est?.quantidade_disponivel ?? 0),
    valorEstoque: Number(est?.valor_estoque ?? 0),
    receita,
    cpv,
    margemBruta: receita - cpv,
    despesasComerciais,
    resultado: receita - cpv - despesasComerciais,
    qtdVendida,
  };
}
