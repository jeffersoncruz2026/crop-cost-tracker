import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDados, calcularResultado } from "@/lib/agro";
import { brl, num, competenciaBR, statusLabel } from "@/lib/format";
import { PageHeader, LinhaResultado, Vazio } from "@/components/agro";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Custeio Agrícola" },
      {
        name: "description",
        content: "Resultado por safra: receita, CPV, margem bruta e custo por categoria.",
      },
      { property: "og:title", content: "Relatórios — Custeio Agrícola" },
      {
        property: "og:description",
        content: "Resultado por safra: receita, CPV, margem bruta e custo por categoria.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const d = useDados();
  const [safraId, setSafraId] = useState("");
  const safra = d.safras.find((s) => s.id === safraId) ?? d.safras[0];
  const idAtual = safra?.id ?? "";
  const cultura = d.culturas.find((c) => c.id === safra?.cultura_id);
  const r = idAtual ? calcularResultado(idAtual, d) : null;

  const apont = d.apontamentos.filter((a) => a.safra_id === idAtual);

  const porCategoria = d.categorias
    .map((c) => ({
      nome: c.nome,
      tipo: c.tipo,
      valor: apont.filter((a) => a.categoria_id === c.id).reduce((s, a) => s + Number(a.valor), 0),
    }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const porMes = Object.entries(
    apont.reduce<Record<string, number>>((acc, a) => {
      const k = a.competencia.slice(0, 7);
      acc[k] = (acc[k] ?? 0) + Number(a.valor);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  const totalCusto = r?.custoTotal ?? 0;
  const maxMes = Math.max(1, ...porMes.map(([, v]) => v));

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao="Resultado da atividade por safra e composição dos custos."
        acao={
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
        }
      />

      {!safra || !r ? (
        <Vazio texto="Cadastre uma safra para ver os relatórios." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Resultado da safra</h2>
              <Badge variant={safra.status === "em_formacao" ? "secondary" : "default"}>
                {statusLabel[safra.status]}
              </Badge>
            </div>
            <div className="mt-4 text-sm">
              <LinhaResultado label="Receita bruta de vendas" valor={r.receita} />
              <LinhaResultado label="CPV — custo dos produtos vendidos" valor={r.cpv} sinal="menos" />
              <LinhaResultado label="Margem bruta" valor={r.margemBruta} forte />
              <LinhaResultado
                label="Despesas comerciais"
                valor={r.despesasComerciais}
                sinal="menos"
              />
              <LinhaResultado label="Resultado da atividade" valor={r.resultado} forte />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Colhido</p>
                <p className="num font-medium">
                  {num(r.qtdColhida)} {cultura?.unidade_medida}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="num font-medium">
                  {num(r.qtdVendida)} {cultura?.unidade_medida}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo unitário</p>
                <p className="num font-medium">{brl(r.custoUnitario)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estoque a custo</p>
                <p className="num font-medium">{brl(r.valorEstoque)}</p>
              </div>
              {safra.area_hectares ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Custo por hectare</p>
                    <p className="num font-medium">
                      {brl(totalCusto / Number(safra.area_hectares))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Produtividade</p>
                    <p className="num font-medium">
                      {num(r.qtdColhida / Number(safra.area_hectares))} {cultura?.unidade_medida}/ha
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Custo por categoria</h2>
            <div className="mt-4 space-y-3">
              {porCategoria.length === 0 ? (
                <Vazio texto="Sem custos lançados." />
              ) : (
                porCategoria.map((c) => (
                  <div key={c.nome}>
                    <div className="flex justify-between text-sm">
                      <span>
                        {c.nome}
                        <span className="ml-2 text-xs text-muted-foreground">{c.tipo}</span>
                      </span>
                      <span className="num">
                        {brl(c.valor)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {((c.valor / (totalCusto || 1)) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(c.valor / (totalCusto || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Custos por competência</h2>
            <div className="mt-4 space-y-3">
              {porMes.length === 0 ? (
                <Vazio texto="Sem apontamentos mensais." />
              ) : (
                porMes.map(([mes, valor]) => (
                  <div key={mes} className="flex items-center gap-3">
                    <span className="num w-16 text-xs text-muted-foreground">
                      {competenciaBR(`${mes}-01`)}
                    </span>
                    <div className="h-3 flex-1 rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full bg-accent"
                        style={{ width: `${(valor / maxMes) * 100}%` }}
                      />
                    </div>
                    <span className="num w-32 text-right text-sm">{brl(valor)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
