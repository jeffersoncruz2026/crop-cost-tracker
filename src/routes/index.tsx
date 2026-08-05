import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sprout, Calculator, Warehouse, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Custeio Agrícola — Custo por safra de milho e soja" },
      {
        name: "description",
        content:
          "Apontamento mensal de custos, estoque em formação, custo unitário na colheita, baixa de CPV e resultado por safra.",
      },
      { property: "og:title", content: "Custeio Agrícola — Custo por safra" },
      {
        property: "og:description",
        content:
          "Do apontamento mensal de custos ao resultado da safra: WIP, colheita, estoque, vendas e CPV.",
      },
    ],
  }),
  component: Home,
});

const etapas = [
  {
    icone: Calculator,
    titulo: "Apontamento mensal",
    texto: "Lance os custos já rateados por safra e categoria. Eles acumulam no estoque em formação.",
  },
  {
    icone: Sprout,
    titulo: "Colheita",
    texto: "Registre a quantidade colhida e o sistema calcula o custo unitário da safra.",
  },
  {
    icone: Warehouse,
    titulo: "Estoque acabado",
    texto: "Quantidade disponível e valor a custo, atualizados a cada venda.",
  },
  {
    icone: TrendingUp,
    titulo: "Venda e resultado",
    texto: "Baixa automática de CPV, margem bruta e resultado da atividade por safra.",
  },
];

function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Custeio Agrícola</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="surface overflow-hidden">
          <div className="bg-gradient-field px-8 py-16 text-primary-foreground sm:px-14">
            <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">
              Milho • Soja
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              Custo por safra, do plantio ao resultado da venda
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-90">
              Cada safra é a unidade de custeio. Todo custo lançado compõe o estoque em formação
              até a colheita travar o custo unitário — e cada venda gera a baixa de CPV
              automaticamente.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/auth">Começar agora</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map((e) => (
            <div key={e.titulo} className="surface p-6">
              <e.icone className="size-6 text-primary" />
              <h2 className="mt-4 font-display text-lg font-semibold">{e.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{e.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
