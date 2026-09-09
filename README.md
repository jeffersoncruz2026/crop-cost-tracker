# Crop Cost Tracker

criar sistema controle de custos
# Especificação — Sistema de Custeio Agrícola (Milho/Soja)

## 1. Visão geral do fluxo

```

Safra (ex: Soja 2025/2026)

   ↓

Apontamento mensal de custo (já rateado, valor final por safra/cultura)

   ↓

Estoque em Formação (WIP) — acumula custo mês a mês

   ↓

COLHEITA → fecha o WIP, registra quantidade colhida (sc ou ton)

   ↓

Custo Unitário = Custo Total Acumulado da Safra ÷ Quantidade Colhida

   ↓

Estoque de Produto Acabado (quantidade + valor = qtd × custo unitário)

   ↓

VENDA (parcial ou total) → Baixa de CPV = qtd vendida × custo unitário médio

   ↓

Resultado da Safra = Receita de Vendas − CPV − Despesas Comerciais (frete, comissão, etc.)

```

Como o controle é **por safra/cultura** (sem talhão) e os custos indiretos já chegam

rateados, cada "Safra" é a unidade de custeio — todo custo lançado nela compõe o WIP

daquela safra até o encerramento da colheita.

---

## 2. Modelo de dados

### `culturas`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| nome | text | "Milho", "Soja" |

| unidade_medida | text | "sc 60kg", "ton" |

### `safras`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| cultura_id | FK → culturas | |

| nome | text | "Soja 2025/2026" |

| data_inicio | date | início do plantio/apontamento |

| data_fim_colheita | date | preenchido ao colher |

| status | enum | `em_formacao`, `colhida`, `encerrada` |

| area_hectares | numeric | opcional, útil p/ indicadores (custo/ha, sc/ha) |

### `categorias_custo`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| nome | text | "Insumos", "Operações", "Mão de obra", "Arrendamento", "Depreciação", "Administrativo rateado" |

| tipo | enum | `direto` / `indireto` (só informativo, já vem rateado) |

### `apontamentos_custo` (lançamento mensal)

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| safra_id | FK → safras | |

| categoria_id | FK → categorias_custo | |

| competencia | date (mês/ano) | mês de referência do custo |

| descricao | text | ex: "Aplicação de fertilizante — 2ª cobertura" |

| valor | numeric(14,2) | valor já rateado/final |

| data_lancamento | date | data do registro no sistema |

| observacao | text | opcional |

> Este é o coração do seu processo atual: todo mês você cria N registros aqui, um por

> categoria de custo, para cada safra em aberto.

### `colheitas`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| safra_id | FK → safras (1:1) | |

| data_colheita | date | pode ser um intervalo — se colher em etapas, ver nota abaixo |

| quantidade_colhida | numeric(14,3) | em sc ou ton |

| observacao | text | |

Ao registrar a colheita, o sistema:

1. Soma todos os `apontamentos_custo` da safra → **custo total**

2. `custo_unitario = custo_total / quantidade_colhida`

3. Muda `safras.status` → `colhida`

4. Cria o registro em `estoque_produto_acabado`

> **Nota:** se a colheita acontece em mais de um dia/lote, transforme `colheitas` em

> 1:N (várias entradas por safra) e recalcule o custo unitário como média ponderada

> a cada nova entrada, até a safra ser marcada como "colheita finalizada".

### `estoque_produto_acabado`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| safra_id | FK → safras | |

| quantidade_disponivel | numeric(14,3) | abate a cada venda |

| custo_unitario | numeric(14,6) | travado no fechamento da colheita |

| valor_estoque | numeric(14,2) | quantidade_disponivel × custo_unitario (calculado) |

### `vendas`

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| safra_id | FK → safras | |

| data_venda | date | |

| quantidade_vendida | numeric(14,3) | |

| preco_unitario_venda | numeric(14,6) | preço de venda negociado |

| valor_total_venda | numeric(14,2) | calculado |

| despesas_comerciais | numeric(14,2) | frete, corretagem, funrural, etc. (opcional detalhar em sub-tabela) |

| comprador | text | opcional |

| nota_fiscal | text | opcional |

### `baixas_cpv` (gerado automaticamente a cada venda)

| Campo | Tipo | Obs |

|---|---|---|

| id | uuid/PK | |

| venda_id | FK → vendas | |

| quantidade | numeric(14,3) | = quantidade_vendida da venda |

| custo_unitario_aplicado | numeric(14,6) | vem do estoque no momento da venda |

| valor_cpv | numeric(14,2) | quantidade × custo_unitario_aplicado |

Ao gravar a venda, o sistema:

1. Busca `custo_unitario` do estoque daquela safra

2. Gera `baixas_cpv` = quantidade vendida × custo unitário

3. Abate `quantidade_disponivel` do estoque

4. Recalcula `valor_estoque`

---

## 3. Regras de negócio importantes

- **Custo unitário travado na colheita**: uma vez colhida a safra, o custo unitário

  não muda mais (mesmo que apareça algum custo residual depois — trate como exceção

  manual, ou reabra o cálculo se ainda fizer sentido no seu processo).

- **Método de baixa**: como o custo unitário é único por safra (não há entradas

  sucessivas com preços diferentes, ao contrário de estoque de mercadoria comprada),

  não é necessário PEPS/UEPS/médio ponderado clássico — é sempre o mesmo custo

  unitário até a safra esgotar o estoque.

- **Venda parcial**: sistema deve permitir múltiplas vendas para a mesma safra, até

  `quantidade_disponivel` chegar a zero.

- **Encerramento da safra**: quando `quantidade_disponivel = 0`, marcar

  `safras.status = encerrada` e liberar o relatório de resultado final.

- **Custo em safra não colhida ainda**: nunca gera CPV — fica só acumulando WIP.

---

## 4. Relatórios necessários

1. **Apuração mensal de custos por safra** — total lançado no mês, acumulado da safra

2. **Posição de estoque** — safras colhidas, quantidade disponível, valor a custo

3. **Relatório de venda com baixa de CPV** — por venda: receita, CPV, margem bruta

   (pronto para você digitar manualmente no contábil: débito CPV / crédito Estoque,

   débito Caixa-Clientes / crédito Receita de Vendas)

4. **Resultado por safra** (o principal):

   | Item | Valor |

   |---|---|

   | Receita de vendas | R$ |

   | (−) CPV | R$ |

   | = Margem bruta | R$ |

   | (−) Despesas comerciais | R$ |

   | = Resultado da atividade | R$ |

   | Custo/ha, Receita/ha, Resultado/ha (se tiver área) | |

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d3f61654-6017-4964-88ad-0dc2cfae790f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
