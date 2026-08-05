import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function inserir(tabela: string, valores: Record<string, unknown>) {
  const { error } = await supabase
    .from(tabela as never)
    .insert(valores as never);
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast.success("Registro salvo.");
  return true;
}

export async function remover(tabela: string, id: string) {
  const { error } = await supabase
    .from(tabela as never)
    .delete()
    .eq("id", id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  toast.success("Registro excluído.");
  return true;
}
