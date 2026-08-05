
REVOKE EXECUTE ON FUNCTION public.recalcular_safra(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_safra() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_venda_before() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_venda_after() FROM anon, authenticated, public;
