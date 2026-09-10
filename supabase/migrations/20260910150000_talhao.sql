
-- NOMECUSTO na planilha do ERP é o talhão da atividade (ex: "F53T1 SOJA..."), não a safra.
-- Guardado como informação de rastreio no lançamento; o custeio continua por safra, sem
-- quebra por talhão, como já era o modelo do sistema.
ALTER TABLE public.apontamentos_custo ADD COLUMN talhao text;
