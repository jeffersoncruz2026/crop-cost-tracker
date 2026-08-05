import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDados, useRecarregar, calcularResultado } from "@/lib/agro";
import { inserir, remover } from "@/lib/crud";
import { brl, num, dataBR, hoje } from "@/lib/format";
import { PageHeader, StatCard, Vazio } from "@/components/agro";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — Custeio Agrícola" },
      { name: "description", content: "Registro de vendas com baixa automática de CPV." },
      { property: "og:title", content: "Vendas — Custeio Agrícola" },
      { property: "og:description", content: "Registro de vendas com baixa automática de CPV." },
    ],
  }),
  component: Vendas,
});

function Vendas() {
  const d = useDados();
  const recarregar = useRecarregar();
  const [safraId, setSafraId] = useState("");
  const safra = d.safras.find((s) => s.id === safraId) ?? d.safras[0];
  const idAtual = safra?.id ?? "";
  const cultura = d.culturas.find((c) => c.id === safra?.cultura_id);
  const r = idAtual ? calcularResultado(idAtual, d) : null;

  const [venda, setVenda] = useState({
    data_venda: hoje(),
    quantidade_vendida: "",
    preco_unitario_venda: "",
    despesas_comerciais: "",
    comprador: "",
    nota_fiscal: "",
  });

  const qtd = Number(venda.quantidade_vendida || 0);
  const preco = Number(venda.preco_unitario_venda || 0);
  const total = qtd * preco;
  const cpvPrevisto = qtd * (r?.custoUnitario ?? 0);
  const excede = r ? qtd > r.qtdDisponivel : false;

  const listaVendas = d.vendas.filter((v) => v.safra_id === idAtual);

  return (
    <>
      <PageHeader
        titulo="Vendas"
        descricao="Cada venda dá baixa no estoque e gera o CPV pelo custo unitário da safra."
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
        <Vazio texto="Cadastre uma safra e registre a colheita antes de vender." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Disponível para venda"
              valor={`${num(r.qtdDisponivel)} ${cultura?.unidade_medida ?? ""}`}
            />
            <StatCard label="Custo unitário" valor={brl(r.custoUnitario)} />
            <StatCard label="Receita acumulada" valor={brl(r.receita)} />
            <StatCard label="CPV acumulado" valor={brl(r.cpv)} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="h-fit p-6">
              <h2 className="font-display text-lg font-semibold">Nova venda</h2>
              <form
                className="mt-4 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await inserir("vendas", {
                    safra_id: idAtual,
                    data_venda: venda.data_venda,
                    quantidade_vendida: qtd,
                    preco_unitario_venda: preco,
                    despesas_comerciais: Number(venda.despesas_comerciais || 0),
                    comprador: venda.comprador || null,
                    nota_fiscal: venda.nota_fiscal || null,
                  });
                  if (ok) {
                    setVenda({
                      data_venda: hoje(),
                      quantidade_vendida: "",
                      preco_unitario_venda: "",
                      despesas_comerciais: "",
                      comprador: "",
                      nota_fiscal: "",
                    });
                    recarregar();
                  }
                }}
              >
                <div className="space-y-2">
                  <Label>Data da venda</Label>
                  <Input
                    type="date"
                    required
                    value={venda.data_venda}
                    onChange={(e) => setVenda({ ...venda, data_venda: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Qtd ({cultura?.unidade_medida})</Label>
                    <Input
                      type="number"
                      step="0.001"
                      required
                      value={venda.quantidade_vendida}
                      onChange={(e) => setVenda({ ...venda, quantidade_vendida: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço unitário</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={venda.preco_unitario_venda}
                      onChange={(e) => setVenda({ ...venda, preco_unitario_venda: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Despesas comerciais (frete, comissão)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={venda.despesas_comerciais}
                    onChange={(e) => setVenda({ ...venda, despesas_comerciais: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Comprador</Label>
                    <Input
                      value={venda.comprador}
                      onChange={(e) => setVenda({ ...venda, comprador: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota fiscal</Label>
                    <Input
                      value={venda.nota_fiscal}
                      onChange={(e) => setVenda({ ...venda, nota_fiscal: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita</span>
                    <span className="num font-medium">{brl(total)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">CPV previsto</span>
                    <span className="num font-medium">{brl(cpvPrevisto)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">Margem bruta</span>
                    <span className="num font-medium">{brl(total - cpvPrevisto)}</span>
                  </div>
                </div>

                {excede && (
                  <p className="text-sm text-destructive">
                    Quantidade maior que o estoque disponível ({num(r.qtdDisponivel)}).
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={excede || qtd <= 0}>
                  Registrar venda
                </Button>
              </form>
            </Card>

            <Card className="p-0">
              <div className="px-6 pt-6">
                <h2 className="font-display text-lg font-semibold">Vendas de {safra.nome}</h2>
              </div>
              <div className="overflow-x-auto p-2">
                {listaVendas.length === 0 ? (
                  <div className="p-4">
                    <Vazio texto="Nenhuma venda registrada nesta safra." />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">CPV</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listaVendas.map((v) => {
                        const cpv = d.baixas
                          .filter((b) => b.venda_id === v.id)
                          .reduce((s, b) => s + Number(b.valor_cpv), 0);
                        return (
                          <TableRow key={v.id}>
                            <TableCell className="num">{dataBR(v.data_venda)}</TableCell>
                            <TableCell>{v.comprador ?? "—"}</TableCell>
                            <TableCell className="num text-right">
                              {num(v.quantidade_vendida)}
                            </TableCell>
                            <TableCell className="num text-right">
                              {brl(Number(v.preco_unitario_venda))}
                            </TableCell>
                            <TableCell className="num text-right">
                              {brl(Number(v.valor_total_venda))}
                            </TableCell>
                            <TableCell className="num text-right">{brl(cpv)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (await remover("vendas", v.id)) recarregar();
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
