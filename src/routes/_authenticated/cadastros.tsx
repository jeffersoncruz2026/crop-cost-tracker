import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDados, useRecarregar } from "@/lib/agro";
import { inserir, remover } from "@/lib/crud";
import { dataBR, hoje, statusLabel } from "@/lib/format";
import { PageHeader, Vazio } from "@/components/agro";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros — Custeio Agrícola" },
      { name: "description", content: "Culturas, categorias de custo e safras." },
      { property: "og:title", content: "Cadastros — Custeio Agrícola" },
      { property: "og:description", content: "Culturas, categorias de custo e safras." },
    ],
  }),
  component: Cadastros,
});

const CATEGORIAS_PADRAO = [
  { nome: "Insumos", tipo: "direto" },
  { nome: "Operações", tipo: "direto" },
  { nome: "Mão de obra", tipo: "direto" },
  { nome: "Arrendamento", tipo: "indireto" },
  { nome: "Depreciação", tipo: "indireto" },
  { nome: "Administrativo rateado", tipo: "indireto" },
];

function Cadastros() {
  const d = useDados();
  const recarregar = useRecarregar();

  const [cultura, setCultura] = useState({ nome: "", unidade_medida: "sc 60kg" });
  const [categoria, setCategoria] = useState({ nome: "", tipo: "direto" });
  const [fazenda, setFazenda] = useState({ nome: "" });
  const [safra, setSafra] = useState({
    nome: "",
    cultura_id: "",
    data_inicio: hoje(),
    area_hectares: "",
  });

  return (
    <>
      <PageHeader titulo="Cadastros" descricao="Culturas, categorias de custo e safras." />

      <Tabs defaultValue="safras">
        <TabsList>
          <TabsTrigger value="safras">Safras</TabsTrigger>
          <TabsTrigger value="culturas">Culturas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias de custo</TabsTrigger>
          <TabsTrigger value="fazendas">Fazendas</TabsTrigger>
        </TabsList>

        <TabsContent value="safras" className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Nova safra</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await inserir("safras", {
                  nome: safra.nome,
                  cultura_id: safra.cultura_id,
                  data_inicio: safra.data_inicio,
                  area_hectares: safra.area_hectares ? Number(safra.area_hectares) : null,
                });
                if (ok) {
                  setSafra({ nome: "", cultura_id: "", data_inicio: hoje(), area_hectares: "" });
                  recarregar();
                }
              }}
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  placeholder="Soja 2025/2026"
                  value={safra.nome}
                  onChange={(e) => setSafra({ ...safra, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cultura</Label>
                <Select
                  value={safra.cultura_id}
                  onValueChange={(v) => setSafra({ ...safra, cultura_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {d.culturas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.unidade_medida})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    required
                    value={safra.data_inicio}
                    onChange={(e) => setSafra({ ...safra, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Área (ha)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={safra.area_hectares}
                    onChange={(e) => setSafra({ ...safra, area_hectares: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!safra.cultura_id}>
                Cadastrar safra
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Safras cadastradas</h2>
            <div className="mt-4 space-y-2">
              {d.safras.length === 0 ? (
                <Vazio texto="Nenhuma safra cadastrada." />
              ) : (
                d.safras.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{s.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.culturas.find((c) => c.id === s.cultura_id)?.nome} • início{" "}
                        {dataBR(s.data_inicio)}
                        {s.area_hectares ? ` • ${s.area_hectares} ha` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === "em_formacao" ? "secondary" : "default"}>
                        {statusLabel[s.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (await remover("safras", s.id)) recarregar();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="culturas" className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Nova cultura</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await inserir("culturas", cultura)) {
                  setCultura({ nome: "", unidade_medida: "sc 60kg" });
                  recarregar();
                }
              }}
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  placeholder="Soja"
                  value={cultura.nome}
                  onChange={(e) => setCultura({ ...cultura, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade de medida</Label>
                <Select
                  value={cultura.unidade_medida}
                  onValueChange={(v) => setCultura({ ...cultura, unidade_medida: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sc 60kg">sc 60kg</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Cadastrar cultura
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Culturas</h2>
            <div className="mt-4 space-y-2">
              {d.culturas.length === 0 ? (
                <Vazio texto="Cadastre Milho e Soja para começar." />
              ) : (
                d.culturas.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <span className="font-medium">
                      {c.nome}{" "}
                      <span className="text-xs text-muted-foreground">({c.unidade_medida})</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (await remover("culturas", c.id)) recarregar();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Nova categoria</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await inserir("categorias_custo", categoria)) {
                  setCategoria({ nome: "", tipo: "direto" });
                  recarregar();
                }
              }}
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  placeholder="Insumos"
                  value={categoria.nome}
                  onChange={(e) => setCategoria({ ...categoria, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={categoria.tipo}
                  onValueChange={(v) => setCategoria({ ...categoria, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direto">Direto</SelectItem>
                    <SelectItem value="indireto">Indireto (já rateado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Cadastrar categoria
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Categorias</h2>
              {d.categorias.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    for (const c of CATEGORIAS_PADRAO) await inserir("categorias_custo", c);
                    recarregar();
                  }}
                >
                  Criar categorias padrão
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {d.categorias.length === 0 ? (
                <Vazio texto="Nenhuma categoria. Use o botão para criar o conjunto padrão." />
              ) : (
                d.categorias.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <span className="font-medium">{c.nome}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{c.tipo}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (await remover("categorias_custo", c.id)) recarregar();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fazendas" className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Nova fazenda</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await inserir("fazendas", fazenda)) {
                  setFazenda({ nome: "" });
                  recarregar();
                }
              }}
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  placeholder="Faz. Aroeira"
                  value={fazenda.nome}
                  onChange={(e) => setFazenda({ ...fazenda, nome: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Cadastrar fazenda
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Fazendas</h2>
            <div className="mt-4 space-y-2">
              {d.fazendas.length === 0 ? (
                <Vazio texto="Nenhuma fazenda cadastrada. Cadastre aqui ou importe uma planilha de custos em Custos & Colheita." />
              ) : (
                d.fazendas.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <span className="font-medium">{f.nome}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (await remover("fazendas", f.id)) recarregar();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
