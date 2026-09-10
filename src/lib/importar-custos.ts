import { supabase } from "@/integrations/supabase/client";
import type { LinhaPlanilha } from "@/lib/xlsx-lite";

const COL_FAZENDA = "NOMEDEPTO";
const COL_TALHAO = "NOMECUSTO";
const COL_CATEGORIA = "DESCRICAO_CONTABIL";
const COL_DESCRICAO_1 = "COMPLEMENTO";
const COL_DESCRICAO_2 = "NOMEPRODUTO";
const COL_VALOR = "SALDO";
const COL_DATA = "DATA";
const COL_CONTA = "CONTA_CONTABIL";
const COL_ORIGEM = "ROWL";

export const COLUNAS_OBRIGATORIAS = [COL_FAZENDA, COL_TALHAO, COL_VALOR, COL_DATA] as const;

const TAMANHO_LOTE = 200;

export type LinhaCustoValida = {
  fazenda: string;
  /** Talhão da atividade (coluna NOMECUSTO, ex: "F53T1 SOJA COMERCIAL..."). Guardado como
   * informação de rastreio no lançamento — os custos continuam sendo por safra, sem quebra
   * por talhão, como já é o modelo do sistema. */
  talhao: string;
  categoria: string;
  categoriaTipo: "direto" | "indireto";
  descricao: string;
  observacao: string | null;
  valor: number;
  competencia: string;
  dataLancamento: string;
  /** Identificador único da linha no extrato de origem (coluna ROWL), usado para não duplicar
   * lançamentos ao reimportar o mesmo relatório em meses seguintes. */
  origemLinha: number | null;
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
  talhoes: GrupoResumo[];
  categorias: GrupoResumo[];
};

function texto(v: LinhaPlanilha[string] | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function primeiroDiaDoMes(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

function somarGrupo(mapa: Map<string, GrupoResumo>, nome: string, valor: number) {
  const g = mapa.get(nome) ?? { nome, registros: 0, valorTotal: 0 };
  g.registros++;
  g.valorTotal += valor;
  mapa.set(nome, g);
}

/** Valida e agrupa as linhas cruas da planilha (DATA = mês de referência, NOMEDEPTO = fazenda,
 * NOMECUSTO = talhão da atividade). Todas as linhas são importadas para UMA safra já cadastrada,
 * escolhida por quem importa — o sistema não quebra custo por talhão. */
export function analisarPlanilhaCustos(linhas: LinhaPlanilha[]): ResultadoAnalise {
  const validas: LinhaCustoValida[] = [];
  let ignoradas = 0;

  const fazendasMap = new Map<string, GrupoResumo>();
  const talhoesMap = new Map<string, GrupoResumo>();
  const categoriasMap = new Map<string, GrupoResumo>();

  for (const linha of linhas) {
    const fazenda = texto(linha[COL_FAZENDA]);
    const talhao = texto(linha[COL_TALHAO]);
    const dataRaw = texto(linha[COL_DATA]);
    const valorRaw = linha[COL_VALOR];
    const valor = typeof valorRaw === "number" ? valorRaw : Number(valorRaw);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw);

    if (!fazenda || !talhao || !dataValida || !Number.isFinite(valor)) {
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
    const origemTexto = texto(linha[COL_ORIGEM]);
    const origemLinha =
      origemTexto && Number.isFinite(Number(origemTexto)) ? Number(origemTexto) : null;

    validas.push({
      fazenda,
      talhao,
      categoria,
      categoriaTipo: categoria.toUpperCase().startsWith("RATEIO") ? "indireto" : "direto",
      descricao,
      observacao: conta
        ? `Conta contábil ${conta} (importado da planilha)`
        : "Importado da planilha",
      valor,
      competencia: primeiroDiaDoMes(dataRaw),
      dataLancamento: dataRaw,
      origemLinha,
    });

    somarGrupo(fazendasMap, fazenda, valor);
    somarGrupo(talhoesMap, talhao, valor);
    somarGrupo(categoriasMap, categoria, valor);
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
    talhoes: [...talhoesMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    categorias: [...categoriasMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

/** Quantas destas linhas (por origemLinha) já foram importadas antes pelo usuário atual. */
export async function contarJaImportados(analise: ResultadoAnalise): Promise<number> {
  const origens = analise.linhas.map((l) => l.origemLinha).filter((v): v is number => v !== null);
  if (origens.length === 0) return 0;

  let encontrados = 0;
  for (let i = 0; i < origens.length; i += TAMANHO_LOTE) {
    const lote = origens.slice(i, i + TAMANHO_LOTE);
    const { data, error } = await supabase
      .from("apontamentos_custo" as never)
      .select("origem_linha")
      .in("origem_linha", lote as never);
    if (error) throw new Error(`Falha ao verificar duplicidade: ${error.message}`);
    encontrados += (data as unknown[] | null)?.length ?? 0;
  }
  return encontrados;
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
  duplicadosIgnorados: number;
  fazendasCriadas: number;
  categoriasCriadas: number;
};

/** Grava os lançamentos de custo numa safra já existente, criando as fazendas/categorias que
 * ainda não existirem. NOMECUSTO (talhão) é gravado como informação de rastreio, não vira safra. */
export async function importarCustos(
  analise: ResultadoAnalise,
  safraId: string,
  existentes: { fazendas: CadastroExistente[]; categorias: CadastroExistente[] },
): Promise<ResultadoImportacao> {
  const fazendasMap = mapaPorNome(existentes.fazendas);
  const categoriasMap = mapaPorNome(existentes.categorias);
  const fazendasAntes = fazendasMap.size;
  const categoriasAntes = categoriasMap.size;

  for (const grupo of analise.fazendas) {
    await obterOuCriarFazenda(fazendasMap, grupo.nome);
  }
  for (const grupo of analise.categorias) {
    const linhaExemplo = analise.linhas.find((l) => l.categoria === grupo.nome);
    await obterOuCriarCategoria(categoriasMap, grupo.nome, linhaExemplo?.categoriaTipo ?? "direto");
  }

  const registros = analise.linhas.map((l) => ({
    safra_id: safraId,
    categoria_id: categoriasMap.get(chave(l.categoria)) as string,
    fazenda_id: fazendasMap.get(chave(l.fazenda)) as string,
    competencia: l.competencia,
    descricao: l.descricao,
    valor: l.valor,
    data_lancamento: l.dataLancamento,
    observacao: l.observacao,
    origem_linha: l.origemLinha,
    talhao: l.talhao,
  }));

  // upsert + ignoreDuplicates: linhas com o mesmo (user_id, origem_linha) de uma importação
  // anterior são puladas em vez de duplicadas — permite reimportar o mesmo relatório todo mês.
  let apontamentosCriados = 0;
  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    const lote = registros.slice(i, i + TAMANHO_LOTE);
    const { data, error } = await supabase
      .from("apontamentos_custo" as never)
      .upsert(lote as never, { onConflict: "user_id,origem_linha", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`Falha ao importar lançamentos: ${error.message}`);
    apontamentosCriados += (data as unknown[] | null)?.length ?? 0;
  }

  return {
    apontamentosCriados,
    duplicadosIgnorados: registros.length - apontamentosCriados,
    fazendasCriadas: fazendasMap.size - fazendasAntes,
    categoriasCriadas: categoriasMap.size - categoriasAntes,
  };
}
