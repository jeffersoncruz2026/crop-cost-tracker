import { supabase } from "@/integrations/supabase/client";
import type { LinhaPlanilha } from "@/lib/xlsx-lite";

const COL_FAZENDA = "NOMEDEPTO";
const COL_SAFRA = "NOMECUSTO";
const COL_CATEGORIA = "DESCRICAO_CONTABIL";
const COL_DESCRICAO_1 = "COMPLEMENTO";
const COL_DESCRICAO_2 = "NOMEPRODUTO";
const COL_VALOR = "SALDO";
const COL_DATA = "DATA";
const COL_CONTA = "CONTA_CONTABIL";

export const COLUNAS_OBRIGATORIAS = [COL_FAZENDA, COL_SAFRA, COL_VALOR, COL_DATA] as const;

export type LinhaCustoValida = {
  fazenda: string;
  safra: string;
  categoria: string;
  categoriaTipo: "direto" | "indireto";
  descricao: string;
  observacao: string | null;
  valor: number;
  competencia: string;
  dataLancamento: string;
};

type GrupoResumo = { nome: string; registros: number; valorTotal: number };

export type ResultadoAnalise = {
  linhas: LinhaCustoValida[];
  totalLinhas: number;
  ignoradas: number;
  valorTotal: number;
  competenciaMin: string | null;
  competenciaMax: string | null;
  fazendas: GrupoResumo[];
  safras: (GrupoResumo & { dataInicio: string })[];
  categorias: GrupoResumo[];
};

function texto(v: LinhaPlanilha[string] | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function primeiroDiaDoMes(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

/** Valida e agrupa as linhas cruas da planilha (DATA = mês de referência, NOMEDEPTO = fazenda). */
export function analisarPlanilhaCustos(linhas: LinhaPlanilha[]): ResultadoAnalise {
  const validas: LinhaCustoValida[] = [];
  let ignoradas = 0;

  const fazendasMap = new Map<string, GrupoResumo>();
  const safrasMap = new Map<string, GrupoResumo & { dataInicio: string }>();
  const categoriasMap = new Map<string, GrupoResumo>();

  for (const linha of linhas) {
    const fazenda = texto(linha[COL_FAZENDA]);
    const safra = texto(linha[COL_SAFRA]);
    const dataRaw = texto(linha[COL_DATA]);
    const valorRaw = linha[COL_VALOR];
    const valor = typeof valorRaw === "number" ? valorRaw : Number(valorRaw);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw);

    if (!fazenda || !safra || !dataValida || !Number.isFinite(valor)) {
      ignoradas++;
      continue;
    }

    const categoria = texto(linha[COL_CATEGORIA]) || "Custos importados";
    const descricao =
      texto(linha[COL_DESCRICAO_1]) ||
      texto(linha[COL_DESCRICAO_2]) ||
      categoria ||
      "Custo importado da planilha";
    const conta = texto(linha[COL_CONTA]);

    validas.push({
      fazenda,
      safra,
      categoria,
      categoriaTipo: categoria.toUpperCase().startsWith("RATEIO") ? "indireto" : "direto",
      descricao,
      observacao: conta
        ? `Conta contábil ${conta} (importado da planilha)`
        : "Importado da planilha",
      valor,
      competencia: primeiroDiaDoMes(dataRaw),
      dataLancamento: dataRaw,
    });

    const fz = fazendasMap.get(fazenda) ?? { nome: fazenda, registros: 0, valorTotal: 0 };
    fz.registros++;
    fz.valorTotal += valor;
    fazendasMap.set(fazenda, fz);

    const sf = safrasMap.get(safra) ?? {
      nome: safra,
      registros: 0,
      valorTotal: 0,
      dataInicio: dataRaw,
    };
    sf.registros++;
    sf.valorTotal += valor;
    if (dataRaw < sf.dataInicio) sf.dataInicio = dataRaw;
    safrasMap.set(safra, sf);

    const ct = categoriasMap.get(categoria) ?? { nome: categoria, registros: 0, valorTotal: 0 };
    ct.registros++;
    ct.valorTotal += valor;
    categoriasMap.set(categoria, ct);
  }

  const competencias = validas.map((l) => l.competencia).sort();

  return {
    linhas: validas,
    totalLinhas: linhas.length,
    ignoradas,
    valorTotal: validas.reduce((s, l) => s + l.valor, 0),
    competenciaMin: competencias[0] ?? null,
    competenciaMax: competencias[competencias.length - 1] ?? null,
    fazendas: [...fazendasMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    safras: [...safrasMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    categorias: [...categoriasMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

type MapaIds = Map<string, string>;

function chave(nome: string): string {
  return nome.trim().toLowerCase();
}

function mapaPorNome(itens: { id: string; nome: string }[]): MapaIds {
  return new Map(itens.map((i) => [chave(i.nome), i.id]));
}

async function obterOuCriarFazenda(mapa: MapaIds, nome: string): Promise<string> {
  const existente = mapa.get(chave(nome));
  if (existente) return existente;
  const { data, error } = await supabase
    .from("fazendas" as never)
    .insert({ nome } as never)
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar fazenda "${nome}": ${error.message}`);
  const id = (data as { id: string }).id;
  mapa.set(chave(nome), id);
  return id;
}

async function obterOuCriarSafra(
  mapa: MapaIds,
  nome: string,
  culturaId: string,
  dataInicio: string,
): Promise<string> {
  const existente = mapa.get(chave(nome));
  if (existente) return existente;
  const { data, error } = await supabase
    .from("safras" as never)
    .insert({ nome, cultura_id: culturaId, data_inicio: dataInicio } as never)
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar safra "${nome}": ${error.message}`);
  const id = (data as { id: string }).id;
  mapa.set(chave(nome), id);
  return id;
}

async function obterOuCriarCategoria(
  mapa: MapaIds,
  nome: string,
  tipo: "direto" | "indireto",
): Promise<string> {
  const existente = mapa.get(chave(nome));
  if (existente) return existente;
  const { data, error } = await supabase
    .from("categorias_custo" as never)
    .insert({ nome, tipo } as never)
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar categoria "${nome}": ${error.message}`);
  const id = (data as { id: string }).id;
  mapa.set(chave(nome), id);
  return id;
}

export type CadastroExistente = { id: string; nome: string };

export type ResultadoImportacao = {
  apontamentosCriados: number;
  fazendasCriadas: number;
  safrasCriadas: number;
  categoriasCriadas: number;
};

const TAMANHO_LOTE = 200;

/** Cria as fazendas/safras/categorias que ainda não existem e grava os lançamentos de custo em lote. */
export async function importarCustos(
  analise: ResultadoAnalise,
  culturaId: string,
  existentes: {
    fazendas: CadastroExistente[];
    safras: CadastroExistente[];
    categorias: CadastroExistente[];
  },
): Promise<ResultadoImportacao> {
  const fazendasMap = mapaPorNome(existentes.fazendas);
  const safrasMap = mapaPorNome(existentes.safras);
  const categoriasMap = mapaPorNome(existentes.categorias);
  const fazendasAntes = fazendasMap.size;
  const safrasAntes = safrasMap.size;
  const categoriasAntes = categoriasMap.size;

  for (const grupo of analise.fazendas) {
    await obterOuCriarFazenda(fazendasMap, grupo.nome);
  }
  for (const grupo of analise.safras) {
    await obterOuCriarSafra(safrasMap, grupo.nome, culturaId, grupo.dataInicio);
  }
  for (const grupo of analise.categorias) {
    const linhaExemplo = analise.linhas.find((l) => l.categoria === grupo.nome);
    await obterOuCriarCategoria(categoriasMap, grupo.nome, linhaExemplo?.categoriaTipo ?? "direto");
  }

  const registros = analise.linhas.map((l) => ({
    safra_id: safrasMap.get(chave(l.safra)) as string,
    categoria_id: categoriasMap.get(chave(l.categoria)) as string,
    fazenda_id: fazendasMap.get(chave(l.fazenda)) as string,
    competencia: l.competencia,
    descricao: l.descricao,
    valor: l.valor,
    data_lancamento: l.dataLancamento,
    observacao: l.observacao,
  }));

  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    const lote = registros.slice(i, i + TAMANHO_LOTE);
    const { error } = await supabase.from("apontamentos_custo" as never).insert(lote as never);
    if (error) throw new Error(`Falha ao importar lançamentos: ${error.message}`);
  }

  return {
    apontamentosCriados: registros.length,
    fazendasCriadas: fazendasMap.size - fazendasAntes,
    safrasCriadas: safrasMap.size - safrasAntes,
    categoriasCriadas: categoriasMap.size - categoriasAntes,
  };
}
