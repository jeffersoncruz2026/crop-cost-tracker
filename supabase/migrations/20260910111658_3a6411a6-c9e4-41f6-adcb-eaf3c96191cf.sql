
CREATE TABLE public.fazendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fazendas TO authenticated;
GRANT ALL ON public.fazendas TO service_role;

ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own fazendas" ON public.fazendas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.apontamentos_custo ADD COLUMN fazenda_id uuid REFERENCES public.fazendas(id) ON DELETE SET NULL;

CREATE INDEX ON public.apontamentos_custo (fazenda_id);
