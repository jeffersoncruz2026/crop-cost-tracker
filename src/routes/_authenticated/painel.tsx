import { createFileRoute, Link } from "@tanstack/react-router";
import { useDados, calcularResultado } from "@/lib/agro";
import { brl, num, statusLabel } from "@/lib/format";
import { PageHeader, StatCard, Vazio } from "@/components/agro";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Custeio Agrícola" },
      { name: "description", content: "Visão geral de custos, estoque e resultado das safras." },
      { property: "og:title", content: "Painel — Custeio Agrícola" },
      { property: "og:description", content: "Visão geral de custos, estoque e resultado." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const d = useDados();
  const linhas = d.safras.map((s) => ({
    safra: s,
    cultura: d.culturas.find((c) => c.id === s.cultura_id),
    r: calcularResultado(s.id, d),
  }));

  const totalWip = linhas
    .filter((l) => l.safra.status === "em_formacao")
    .reduce((s, l) => s + l.r.custoTotal, 0);
  const totalEstoque = linhas.reduce((s, l) => s + l.r.valorEstoque, 0);
  const totalReceita = linhas.reduce((s, l) => s + l.r.receita, 0);
  const totalResultado = linhas.reduce((s, l) => s + l.r.resultado, 0);

  return (
    <>
      <PageHeader
        titulo="Painel"
        descricao="Posição consolidada das safras: custo em formação, estoque e resultado."
        acao={
          <Button asChild>
            <Link to="/custos">Lançar custo do mês</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="WIP — safras em formação" valor={brl(totalWip)} detalhe="Custo acumulado" />
        <StatCard label="Estoque a custo" valor={brl(totalEstoque)} detalhe="Produto acabado" />
        <StatCard label="Receita de vendas" valor={brl(totalReceita)} />
        <StatCard
          label="Resultado da atividade"
          valor={brl(totalResultado)}
          destaque={totalResultado >= 0 ? "positivo" : "negativo"}
        />
      </div>

      <Card className="mt-8 p-0">
        <div className="px-6 pt-6">
          <h2 className="font-display text-xl font-semibold">Safras</h2>
        </div>
        <div className="overflow-x-auto p-2">
          {linhas.length === 0 ? (
            <div className="p-4">
              <Vazio texto="Nenhuma safra cadastrada ainda. Comece pelos cadastros." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Safra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo acumulado</TableHead>
                  <TableHead className="text-right">Colhido</TableHead>
                  <TableHead className="text-right">Custo unitário</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ safra, cultura, r }) => (
                  <TableRow key={safra.id}>
                    <TableCell className="font-medium">
                      {safra.nome}
                      <span className="ml-2 text-xs text-muted-foreground">{cultura?.nome}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={safra.status === "em_formacao" ? "secondary" : "default"}>
                        {statusLabel[safra.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="num text-right">{brl(r.custoTotal)}</TableCell>
                    <TableCell className="num text-right">
                      {num(r.qtdColhida)} {cultura?.unidade_medida}
                    </TableCell>
                    <TableCell className="num text-right">{brl(r.custoUnitario)}</TableCell>
                    <TableCell className="num text-right">{num(r.qtdDisponivel)}</TableCell>
                    <TableCell
                      className={`num text-right ${r.resultado < 0 ? "text-destructive" : ""}`}
                    >
                      {brl(r.resultado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </>
  );
}
