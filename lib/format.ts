export const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const percent = (value: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`;
export const dateBR = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : "—";
export const dateTimeBR = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
export const monthBR = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(`${value}-15T12:00:00Z`)).replace(".", "");
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
export const stageLabel: Record<string, string> = { Qualificacao: "Qualificação", Proposta: "Proposta", Negociacao: "Negociação", Ganho: "Ganho", Perdido: "Perdido" };
export const stageClass: Record<string, string> = { Qualificacao: "qualificacao", Proposta: "proposta", Negociacao: "negociacao", Ganho: "ganho", Perdido: "perdido" };
