import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}

export function StatCard({
  label,
  valor,
  detalhe,
  destaque,
}: {
  label: string;
  valor: string;
  detalhe?: string;
  destaque?: "positivo" | "negativo" | "neutro";
}) {
  const cor =
    destaque === "positivo"
      ? "text-success"
      : destaque === "negativo"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card className="gap-1 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`num font-display text-2xl font-semibold ${cor}`}>{valor}</p>
      {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
    </Card>
  );
}

export function LinhaResultado({
  label,
  valor,
  forte,
  sinal,
}: {
  label: string;
  valor: number;
  forte?: boolean;
  sinal?: "menos";
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border/70 py-2.5 last:border-0 ${
        forte ? "font-semibold" : ""
      }`}
    >
      <span className={forte ? "" : "text-muted-foreground"}>
        {sinal === "menos" ? "(−) " : ""}
        {label}
      </span>
      <span className={`num ${valor < 0 ? "text-destructive" : ""}`}>{brl(valor)}</span>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {texto}
    </p>
  );
}
