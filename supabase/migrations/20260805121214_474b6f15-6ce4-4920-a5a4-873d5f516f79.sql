
CREATE TYPE public.safra_status AS ENUM ('em_formacao','colhida','encerrada');
CREATE TYPE public.categoria_tipo AS ENUM ('direto','indireto');

CREATE TABLE public.culturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  unidade_medida text NOT NULL DEFAULT 'sc 60kg',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categorias_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  tipo public.categoria_tipo NOT NULL DEFAULT 'direto',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.safras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  cultura_id uuid NOT NULL REFERENCES public.culturas(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  data_inicio date NOT NULL DEFAULT current_date,
  data_fim_colheita date,
  status public.safra_status NOT NULL DEFAULT 'em_formacao',
  area_hectares numeric(14,3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.apontamentos_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  safra_id uuid NOT NULL REFERENCES public.safras(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias_custo(id) ON DELETE RESTRICT,
  competencia date NOT NULL,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  data_lancamento date NOT NULL DEFAULT current_date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.colheitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  safra_id uuid NOT NULL REFERENCES public.safras(id) ON DELETE CASCADE,
  data_colheita date NOT NULL DEFAULT current_date,
  quantidade_colhida numeric(14,3) NOT NULL CHECK (quantidade_colhida > 0),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.estoque_produto_acabado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  safra_id uuid NOT NULL UNIQUE REFERENCES public.safras(id) ON DELETE CASCADE,
  quantidade_total numeric(14,3) NOT NULL DEFAULT 0,
  quantidade_disponivel numeric(14,3) NOT NULL DEFAULT 0,
  custo_unitario numeric(14,6) NOT NULL DEFAULT 0,
  valor_estoque numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  safra_id uuid NOT NULL REFERENCES public.safras(id) ON DELETE CASCADE,
  data_venda date NOT NULL DEFAULT current_date,
  quantidade_vendida numeric(14,3) NOT NULL CHECK (quantidade_vendida > 0),
  preco_unitario_venda numeric(14,6) NOT NULL CHECK (preco_unitario_venda >= 0),
  valor_total_venda numeric(14,2) NOT NULL DEFAULT 0,
  despesas_comerciais numeric(14,2) NOT NULL DEFAULT 0,
  comprador text,
  nota_fiscal text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.baixas_cpv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  venda_id uuid NOT NULL UNIQUE REFERENCES public.vendas(id) ON DELETE CASCADE,
  safra_id uuid NOT NULL REFERENCES public.safras(id) ON DELETE CASCADE,
  quantidade numeric(14,3) NOT NULL,
  custo_unitario_aplicado numeric(14,6) NOT NULL,
  valor_cpv numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.culturas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_custo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apontamentos_custo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colheitas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_produto_acabado TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.baixas_cpv TO authenticated;
GRANT ALL ON public.culturas, public.categorias_custo, public.safras, public.apontamentos_custo,
  public.colheitas, public.estoque_produto_acabado, public.vendas, public.baixas_cpv TO service_role;

ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colheitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_produto_acabado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baixas_cpv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own culturas" ON public.culturas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own categorias" ON public.categorias_custo FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own safras" ON public.safras FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own apontamentos" ON public.apontamentos_custo FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own colheitas" ON public.colheitas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own estoque" ON public.estoque_produto_acabado FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vendas" ON public.vendas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own baixas" ON public.baixas_cpv FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.recalcular_safra(_safra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _custo_total numeric(14,2);
  _qtd_colhida numeric(14,3);
  _qtd_vendida numeric(14,3);
  _cu numeric(14,6);
  _disp numeric(14,3);
BEGIN
  SELECT user_id INTO _owner FROM public.safras WHERE id = _safra_id;
  IF _owner IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(valor),0) INTO _custo_total FROM public.apontamentos_custo WHERE safra_id = _safra_id;
  SELECT COALESCE(SUM(quantidade_colhida),0) INTO _qtd_colhida FROM public.colheitas WHERE safra_id = _safra_id;
  SELECT COALESCE(SUM(quantidade_vendida),0) INTO _qtd_vendida FROM public.vendas WHERE safra_id = _safra_id;

  IF _qtd_colhida > 0 THEN
    _cu := ROUND(_custo_total / _qtd_colhida, 6);
    _disp := _qtd_colhida - _qtd_vendida;

    INSERT INTO public.estoque_produto_acabado (user_id, safra_id, quantidade_total, quantidade_disponivel, custo_unitario, valor_estoque, updated_at)
    VALUES (_owner, _safra_id, _qtd_colhida, _disp, _cu, ROUND(_disp * _cu, 2), now())
    ON CONFLICT (safra_id) DO UPDATE SET
      quantidade_total = EXCLUDED.quantidade_total,
      quantidade_disponivel = EXCLUDED.quantidade_disponivel,
      custo_unitario = EXCLUDED.custo_unitario,
      valor_estoque = EXCLUDED.valor_estoque,
      updated_at = now();

    UPDATE public.baixas_cpv b
      SET custo_unitario_aplicado = _cu,
          valor_cpv = ROUND(b.quantidade * _cu, 2)
      WHERE b.safra_id = _safra_id;

    UPDATE public.safras SET status = CASE WHEN _disp <= 0 THEN 'encerrada'::public.safra_status ELSE 'colhida'::public.safra_status END
      WHERE id = _safra_id;
  ELSE
    DELETE FROM public.estoque_produto_acabado WHERE safra_id = _safra_id;
    UPDATE public.safras SET status = 'em_formacao' WHERE id = _safra_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_safra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_safra(OLD.safra_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalcular_safra(NEW.safra_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_venda_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _disp numeric(14,3);
BEGIN
  SELECT quantidade_disponivel INTO _disp FROM public.estoque_produto_acabado WHERE safra_id = NEW.safra_id;
  IF _disp IS NULL THEN
    RAISE EXCEPTION 'Safra ainda nao colhida: nao ha estoque para vender';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    _disp := _disp + OLD.quantidade_vendida;
  END IF;
  IF NEW.quantidade_vendida > _disp THEN
    RAISE EXCEPTION 'Quantidade vendida (%) maior que o estoque disponivel (%)', NEW.quantidade_vendida, _disp;
  END IF;
  NEW.valor_total_venda := ROUND(NEW.quantidade_vendida * NEW.preco_unitario_venda, 2);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_venda_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cu numeric(14,6);
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_safra(OLD.safra_id);
    RETURN OLD;
  END IF;

  SELECT custo_unitario INTO _cu FROM public.estoque_produto_acabado WHERE safra_id = NEW.safra_id;
  _cu := COALESCE(_cu, 0);

  INSERT INTO public.baixas_cpv (user_id, venda_id, safra_id, quantidade, custo_unitario_aplicado, valor_cpv)
  VALUES (NEW.user_id, NEW.id, NEW.safra_id, NEW.quantidade_vendida, _cu, ROUND(NEW.quantidade_vendida * _cu, 2))
  ON CONFLICT (venda_id) DO UPDATE SET
    quantidade = EXCLUDED.quantidade,
    custo_unitario_aplicado = EXCLUDED.custo_unitario_aplicado,
    valor_cpv = EXCLUDED.valor_cpv;

  PERFORM public.recalcular_safra(NEW.safra_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER apontamentos_recalc AFTER INSERT OR UPDATE OR DELETE ON public.apontamentos_custo
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_safra();

CREATE TRIGGER colheitas_recalc AFTER INSERT OR UPDATE OR DELETE ON public.colheitas
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_safra();

CREATE TRIGGER vendas_before BEFORE INSERT OR UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.trg_venda_before();

CREATE TRIGGER vendas_after AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.trg_venda_after();

CREATE INDEX ON public.apontamentos_custo (safra_id);
CREATE INDEX ON public.colheitas (safra_id);
CREATE INDEX ON public.vendas (safra_id);
CREATE INDEX ON public.safras (user_id);
