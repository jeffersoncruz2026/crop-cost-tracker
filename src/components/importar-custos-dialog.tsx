import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useDados, useRecarregar } from "@/lib/agro";
import { lerPlanilhaXlsx } from "@/lib/xlsx-lite";
import {
  analisarPlanilhaCustos,
  contarJaImportados,
  importarCustos,
  COLUNAS_OBRIGATORIAS,
  type ResultadoAnalise,
} from "@/lib/importar-custos";
import { brl, competenciaBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ListaGrupos({
  titulo,
  grupos,
  nomesExistentes,
}: {
  titulo: string;
  grupos: { nome: string; registros: number }[];
  nomesExistentes: Set<string>;
}) {
  const novos = grupos.filter((g) => !nomesExistentes.has(g.nome.trim().toLowerCase())).length;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo} ({grupos.length}
        {novos > 0 ? `, ${novos} novas` : ""})
      </p>
      <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {grupos.map((g) => {
          const nova = !nomesExistentes.has(g.nome.trim().toLowerCase());
          return (
            <div key={g.nome} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate" title={g.nome}>
                {g.nome}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                {g.registros}×{nova ? <Badge variant="secondary">nova</Badge> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ImportarCustosDialog() {
  const d = useDados();
  const recarregar = useRecarregar();

  const [open, setOpen] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [estado, setEstado] = useState<"ocioso" | "lendo" | "importando">("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<ResultadoAnalise | null>(null);
  const [jaImportados, setJaImportados] = useState<number | null>(null);
  const [culturaId, setCulturaId] = useState("");

  function reiniciar() {
    setNomeArquivo(null);
    setEstado("ocioso");
    setErro(null);
    setAnalise(null);
    setJaImportados(null);
    setCulturaId("");
  }

  async function selecionarArquivo(arquivo: File) {
    setNomeArquivo(arquivo.name);
    setErro(null);
    setAnalise(null);
    setEstado("lendo");
    try {
      const { cabecalhos, linhas } = await lerPlanilhaXlsx(arquivo);
      const faltando = COLUNAS_OBRIGATORIAS.filter((c) => !cabecalhos.includes(c));
      if (faltando.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes na planilha: ${faltando.join(", ")}.`);
      }
      const resultado = analisarPlanilhaCustos(linhas);
      if (resultado.linhas.length === 0) {
        throw new Error("Nenhuma linha válida encontrada nesta planilha.");
      }
      setAnalise(resultado);

      const culturaDetectada = d.culturas.find((c) =>
        resultado.safras.some((s) => s.nome.toUpperCase().includes(c.nome.toUpperCase())),
      );
      if (culturaDetectada) setCulturaId(culturaDetectada.id);

      try {
        setJaImportados(await contarJaImportados(resultado));
      } catch {
        setJaImportados(null); // não bloqueia a importação se a checagem falhar
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally {
      setEstado("ocioso");
    }
  }

  async function confirmar() {
    if (!analise || !culturaId) return;
    setEstado("importando");
    setErro(null);
    try {
      const resultado = await importarCustos(analise, culturaId, {
        fazendas: d.fazendas,
        safras: d.safras,
        categorias: d.categorias,
      });
      const duplicados =
        resultado.duplicadosIgnorados > 0
          ? ` ${resultado.duplicadosIgnorados} já existiam e foram ignorados.`
          : "";
      toast.success(
        `${resultado.apontamentosCriados} lançamentos importados` +
          ` (${resultado.fazendasCriadas} fazendas, ${resultado.safrasCriadas} safras e` +
          ` ${resultado.categoriasCriadas} categorias novas).${duplicados}`,
      );
      recarregar();
      setOpen(false);
      reiniciar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao importar a planilha.";
      setErro(msg);
      toast.error(msg);
    } finally {
      setEstado("ocioso");
    }
  }

  const nomes = (itens: { nome: string }[]) =>
    new Set(itens.map((i) => i.nome.trim().toLowerCase()));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reiniciar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Importar planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar relatório mensal de custos</DialogTitle>
          <DialogDescription>
            Envie o extrato de custos (.xlsx) do ERP. A coluna <b>DATA</b> vira a competência (mês
            de referência) e <b>NOMEDEPTO</b> vira a fazenda de cada lançamento. Fazendas, safras e
            categorias que ainda não existirem são criadas automaticamente. Pode reenviar o mesmo
            relatório todo mês: linhas já importadas antes (mesma origem no ERP) não duplicam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo (.xlsx)</Label>
            <input
              type="file"
              accept=".xlsx"
              disabled={estado !== "ocioso"}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void selecionarArquivo(arquivo);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            />
            {nomeArquivo ? (
              <p className="text-xs text-muted-foreground">Arquivo: {nomeArquivo}</p>
            ) : null}
          </div>

          {estado === "lendo" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Lendo planilha…
            </p>
          ) : null}

          {erro ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          ) : null}

          {analise ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Lançamentos válidos</p>
                  <p className="num font-semibold">{analise.linhas.length}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="num font-semibold">{brl(analise.valorTotal)}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="num font-semibold">
                    {analise.competenciaMin ? competenciaBR(analise.competenciaMin) : "—"}
                    {" a "}
                    {analise.competenciaMax ? competenciaBR(analise.competenciaMax) : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Já importados antes</p>
                  <p className="num font-semibold">{jaImportados ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Novos a importar</p>
                  <p className="num font-semibold text-success">
                    {jaImportados !== null ? analise.linhas.length - jaImportados : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Ignoradas (inválidas)</p>
                  <p
                    className={`num font-semibold ${analise.ignoradas > 0 ? "text-destructive" : ""}`}
                  >
                    {analise.ignoradas}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cultura das safras a criar</Label>
                <Select value={culturaId} onValueChange={setCulturaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {d.culturas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {d.culturas.length === 0 ? (
                  <p className="text-xs text-destructive">
                    Cadastre uma cultura em Cadastros antes de importar.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <ListaGrupos
                  titulo="Fazendas"
                  grupos={analise.fazendas}
                  nomesExistentes={nomes(d.fazendas)}
                />
                <ListaGrupos
                  titulo="Safras"
                  grupos={analise.safras}
                  nomesExistentes={nomes(d.safras)}
                />
                <ListaGrupos
                  titulo="Categorias de custo"
                  grupos={analise.categorias}
                  nomesExistentes={nomes(d.categorias)}
                />
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={confirmar} disabled={!analise || !culturaId || estado === "importando"}>
            {estado === "importando" ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
