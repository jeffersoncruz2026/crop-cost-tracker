-- Importações de custos reais (ERP) podem trazer estornos/correções negativas.
ALTER TABLE public.apontamentos_custo DROP CONSTRAINT IF EXISTS apontamentos_custo_valor_check;

-- Permite reimportar o mesmo relatório de custos todo mês sem duplicar lançamentos:
-- a coluna ROWL da planilha do ERP é o identificador único de cada linha do extrato.
ALTER TABLE public.apontamentos_custo ADD COLUMN origem_linha bigint;

-- NULL (lançamentos manuais, sem origem de planilha) não conflita entre si.
ALTER TABLE public.apontamentos_custo ADD CONSTRAINT apontamentos_custo_user_origem_key UNIQUE (user_id, origem_linha);
