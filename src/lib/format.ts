export const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v: number | null | undefined, casas = 3) =>
  (v ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

export const dataBR = (v: string | null | undefined) => {
  if (!v) return "—";
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const competenciaBR = (v: string | null | undefined) => {
  if (!v) return "—";
  const [y, m] = v.slice(0, 10).split("-");
  return `${m}/${y}`;
};

export const hoje = () => new Date().toISOString().slice(0, 10);

export const mesAtual = () => `${new Date().toISOString().slice(0, 7)}-01`;

export const statusLabel: Record<string, string> = {
  em_formacao: "Em formação",
  colhida: "Colhida",
  encerrada: "Encerrada",
};
