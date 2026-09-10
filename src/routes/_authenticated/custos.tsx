import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDados, useRecarregar, calcularResultado, type ResultadoSafra } from "@/lib/agro";
import { inserir, remover } from "@/lib/crud";
import { brl, num, dataBR, competenciaBR, hoje, mesAtual } from "@/lib/format";
import { PageHeader, StatCard, Vazio } from "@/components/agro";
import { ImportarCustosDialog } from "@/components/importar-custos-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/custos")({
  head: () => ({
    meta: [
      { title: "Custos e Colheita — Custeio Agrícola" },
      {
        name: "description",
        content: "Apontamento mensal de custos por safra e registro de colheita.",
      },
      { property: "og:title", content: "Custos e Colheita — Custeio Agrícola" },
      {
        property: "og:description",
        content: "Apontamento mensal de custos por safra e registro de colheita.",
      },
    ],
  }),
  component: Custos,
});

const RESULTADO_VAZIO: ResultadoSafra = {
  custoTotal: 0,
  qtdColhida: 0,
  custoUnitario: 0,
  qtdDisponivel: 0,
  valorEstoque: 0,
  receita: 0,
  cpv: 0,
  margemBruta: 0,
  despesasComerciais: 0,
  resultado: 0,
  qtdVendida: 0,
};

function Custos() {
  const d = useDados();
  const recarregar = useRecarregar();
  const [safraId, setSafraId] = useState("");
  const safra = d.safras.find((s) => s.id === safraId) ?? d.safras[0];
  const idAtual = safra?.id ?? "";
  const cultura = d.culturas.find((c) => c.id === safra?.cultura_id);

  const [apont, setApont] = useState({
    categoria_id: "",
    fazenda_id: "",
    talhao: "",
    competencia: mesAtual().slice(0, 7),
    descricao: "",
    valor: "",
    data_lancamento: hoje(),
    observacao: "",
  });
  const [colheita, setColheita] = useState({
    data_colheita: hoje(),
    quantidade_colhida: "",
    observacao: "",
  });

  const r = useMemo(
    () => (idAtual ? calcularResultado(idAtual, d) : RESULTADO_VAZIO),
    [idAtual, d],
  );

  const lancamentos = d.apontamentos.filter((a) => a.safra_id === idAtual);
  const colheitas = d.colheitas.filter((c) => c.safra_id === idAtual);

  return (
    <>
      <PageHeader
        titulo="Custos & Colheita"
        descricao="Lance os custos já rateados do mês e registre a colheita para travar o custo unitário."
        acao={
          <div className="flex items-end gap-3">
            <ImportarCustosDialog />
            <div className="w-64">
              <Select value={idAtual} onValueChange={setSafraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a safra" />
                </SelectTrigger>
                <SelectContent>
                  {d.safras.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {!safra ? (
        <Vazio texto="Cadastre uma safra primeiro na aba Cadastros." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Estoque em formação (WIP)" valor={brl(r.custoTotal)} />
            <StatCard
              label="Quantidade colhida"
              valor={`${num(r.qtdColhida)} ${cultura?.unidade_medida ?? ""}`}
            />
            <StatCard
              label="Custo unitário"
              valor={brl(r.custoUnitario)}
              detalhe={`por ${cultura?.unidade_medida ?? "un"}`}
            />
            <StatCard
              label="Custo por hectare"
              valor={safra.area_hectares ? brl(r.custoTotal / Number(safra.area_hectares)) : "—"}
              detalhe={safra.area_hectares ? `${safra.area_hectares} ha` : "Área não informada"}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold">Novo apontamento</h2>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await inserir("apontamentos_custo", {
                      safra_id: idAtual,
                      categoria_id: apont.categoria_id,
                      fazenda_id: apont.fazenda_id || null,
                      talhao: apont.talhao || null,
                      competencia: `${apont.competencia}-01`,
                      descricao: apont.descricao,
                      valor: Number(apont.valor),
                      data_lancamento: apont.data_lancamento,
                      observacao: apont.observacao || null,
                    });
                    if (ok) {
                      setApont({ ...apont, descricao: "", valor: "", observacao: "" });
                      recarregar();
                    }
                  }}
                >
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={apont.categoria_id}
                      onValueChange={(v) => setApont({ ...apont, categoria_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {d.categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fazenda</Label>
                    <Select
                      value={apont.fazenda_id}
                      onValueChange={(v) => setApont({ ...apont, fazenda_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {d.fazendas.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Talhão</Label>
                    <Input
                      placeholder="Opcional"
                      value={apont.talhao}
                      onChange={(e) => setApont({ ...apont, talhao: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Competência</Label>
                      <Input
                        type="month"
                        required
                        value={apont.competencia}
                        onChange={(e) => setApont({ ...apont, competencia: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={apont.valor}
                        onChange={(e) => setApont({ ...apont, valor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      required
                      placeholder="Fertilizante — 2ª cobertura"
                      value={apont.descricao}
                      onChange={(e) => setApont({ ...apont, descricao: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data do lançamento</Label>
                    <Input
                      type="date"
                      required
                      value={apont.data_lancamento}
                      onChange={(e) => setApont({ ...apont, data_lancamento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Textarea
                      rows={2}
                      value={apont.observacao}
                      onChange={(e) => setApont({ ...apont, observacao: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!apont.categoria_id}>
                    Lançar custo
                  </Button>
                </form>
              </Card>

              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold">Registrar colheita</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada entrada soma à quantidade colhida e recalcula o custo unitário.
                </p>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await inserir("colheitas", {
                      safra_id: idAtual,
                      data_colheita: colheita.data_colheita,
                      quantidade_colhida: Number(colheita.quantidade_colhida),
                      observacao: colheita.observacao || null,
                    });
                    if (ok) {
                      setColheita({ ...colheita, quantidade_colhida: "", observacao: "" });
                      recarregar();
                    }
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        required
                        value={colheita.data_colheita}
                        onChange={(e) =>
                          setColheita({ ...colheita, data_colheita: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qtd ({cultura?.unidade_medida})</Label>
                      <Input
                        type="number"
                        step="0.001"
                        required
                        value={colheita.quantidade_colhida}
                        onChange={(e) =>
                          setColheita({ ...colheita, quantidade_colhida: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input
                      value={colheita.observacao}
                      onChange={(e) => setColheita({ ...colheita, observacao: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Registrar colheita
                  </Button>
                </form>

                <div className="mt-5 space-y-2">
                  {colheitas.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        {dataBR(c.data_colheita)} — {num(c.quantidade_colhida)}{" "}
                        {cultura?.unidade_medida}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (await remover("colheitas", c.id)) recarregar();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-0">
              <div className="px-6 pt-6">
                <h2 className="font-display text-lg font-semibold">Apontamentos de {safra.nome}</h2>
              </div>
              <div className="overflow-x-auto p-2">
                {lancamentos.length === 0 ? (
                  <div className="p-4">
                    <Vazio texto="Nenhum custo lançado nesta safra." />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competência</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Fazenda</TableHead>
                        <TableHead>Talhão</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentos.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="num">{competenciaBR(a.competencia)}</TableCell>
                          <TableCell>
                            {d.categorias.find((c) => c.id === a.categoria_id)?.nome}
                          </TableCell>
                          <TableCell>
                            {d.fazendas.find((f) => f.id === a.fazenda_id)?.nome ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={a.talhao ?? ""}>
                            {a.talhao ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate">{a.descricao}</TableCell>
                          <TableCell className="num text-right">{brl(Number(a.valor))}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (await remover("apontamentos_custo", a.id)) recarregar();
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
