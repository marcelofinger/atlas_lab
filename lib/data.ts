import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Proposal, ProposalHistory } from "@/lib/types";

export async function getIdentity() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

export async function getProposals(filters: Record<string, string | undefined> = {}): Promise<Proposal[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  let query = supabase.from("propostas").select("*, clientes(empresa), vendedores(nome), produtos(nome)").eq("vigente", true).order("updated_at", { ascending: false });
  if (filters.q) query = query.ilike("proposta_id", `%${filters.q}%`);
  if (filters.etapa) query = query.eq("etapa", filters.etapa);
  if (filters.vendedor) query = query.eq("vendedor_id", filters.vendedor);
  if (filters.regiao) query = query.eq("regiao", filters.regiao);
  if (filters.canal) query = query.eq("canal", filters.canal);
  if (filters.produto) query = query.eq("produto_id", filters.produto);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Proposal[];
}

export async function getProposal(code: string, version?: number): Promise<Proposal | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  let query = supabase.from("propostas").select("*, clientes(empresa), vendedores(nome), produtos(nome)").eq("proposta_id", code);
  query = version ? query.eq("versao", version) : query.eq("vigente", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Proposal | null;
}

export async function getProposalVersions(code: string) {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("propostas").select("proposta_id,versao,vigente,etapa").eq("proposta_id", code).order("versao", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProposalHistory(code: string, version?: number): Promise<ProposalHistory[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  let query = supabase.from("historico_propostas").select("*").eq("proposta_id", code).order("ocorrido_em", { ascending: false });
  if (version) query = query.eq("versao", version);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProposalHistory[];
}

export async function getRecentHistory(): Promise<ProposalHistory[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("historico_propostas").select("*").order("ocorrido_em", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProposalHistory[];
}

export async function getLookups() {
  if (!hasSupabaseEnv()) return { clientes: [], vendedores: [], produtos: [] };
  const supabase = await createClient();
  const [clientes, vendedores, produtos] = await Promise.all([
    supabase.from("clientes").select("cliente_id,empresa").order("empresa"),
    supabase.from("vendedores").select("vendedor_id,nome,regiao").order("nome"),
    supabase.from("produtos").select("produto_id,nome,preco_unitario,custo_unitario").order("nome"),
  ]);
  return { clientes: clientes.data ?? [], vendedores: vendedores.data ?? [], produtos: produtos.data ?? [] };
}

export async function getGoals() {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("metas").select("mes,meta_vendas_ganhas").order("mes");
  if (error) throw new Error(error.message);
  return data ?? [];
}
