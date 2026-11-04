"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { calcProposal } from "@/lib/proposal-rules";

function required(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Preencha ${label}.`);
  return text;
}

export async function signIn(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/login?erro=config");
  const email = required(formData.get("email"), "o e-mail");
  const password = required(formData.get("password"), "a senha");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  redirect("/dashboard");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function saveProposal(formData: FormData) {
  if (!hasSupabaseEnv()) throw new Error("Configure o Supabase para gravar propostas.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const code = String(formData.get("proposta_id") ?? "").trim();
  const version = Number(formData.get("versao") ?? 1);
  const quantity = Number(formData.get("quantidade"));
  const unitPrice = Number(formData.get("preco_unitario"));
  const discount = Number(formData.get("desconto_pct")) / 100;
  const totalCost = Number(formData.get("custo_total"));
  const stage = required(formData.get("etapa"), "a etapa");
  if (!["Qualificacao", "Proposta", "Negociacao", "Perdido"].includes(stage)) throw new Error("Esta etapa exige uma função autorizada do CRM.");
  if (!/^[A-Z0-9-]{5,24}$/.test(code)) throw new Error("Use um código válido para a proposta.");
  if (!Number.isInteger(version) || version < 1) throw new Error("Versão deve ser um inteiro positivo.");
  const createdAt = required(formData.get("data_criacao"), "a data de criação");
  const closedAt = stage === "Perdido" ? required(formData.get("data_fechamento"), "a data de fechamento") : null;
  if (closedAt && closedAt < createdAt) throw new Error("A data de fechamento não pode anteceder a criação.");
  const probability = stage === "Qualificacao" ? 0.2 : stage === "Proposta" ? 0.5 : stage === "Negociacao" ? 0.75 : 0;
  const calculated = calcProposal({ quantity, unitPrice, discount, totalCost, probability });
  const sellerId = required(formData.get("vendedor_id"), "o responsável");
  const { data: seller, error: sellerError } = await supabase.from("vendedores").select("regiao").eq("vendedor_id", sellerId).maybeSingle();
  if (sellerError) throw new Error(sellerError.message);
  if (!seller) throw new Error("O responsável informado não pertence à sua carteira.");

  const originalVersion = Number(formData.get("row_version") ?? 0);
  const existing = await supabase.from("propostas").select("etapa,row_version,vigente,aprovacao_desconto").eq("proposta_id", code).eq("versao", version).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data && !existing.data.vigente) throw new Error("Versões anteriores são preservadas; edite somente a versão vigente.");
  if (existing.data && (!originalVersion || Number(existing.data.row_version) !== originalVersion)) throw new Error("A proposta foi alterada desde que você a abriu. Recarregue e tente novamente.");
  const payload = {
    owner_id: claims.sub,
    proposta_id: code,
    versao: version,
    vigente: true,
    cliente_id: required(formData.get("cliente_id"), "o cliente"),
    vendedor_id: sellerId,
    produto_id: required(formData.get("produto_id"), "o produto"),
    regiao: seller.regiao,
    canal: required(formData.get("canal"), "o canal"),
    data_criacao: createdAt,
    data_fechamento: closedAt,
    validade: required(formData.get("validade"), "a validade"),
    etapa: stage,
    quantidade: quantity,
    preco_unitario: unitPrice,
    desconto_pct: discount,
    custo_total: totalCost,
    aprovacao_desconto: existing.data?.aprovacao_desconto ?? null,
    probabilidade: probability,
    condicao_pagamento: required(formData.get("condicao_pagamento"), "a condição de pagamento"),
    motivo_perda: stage === "Perdido" ? required(formData.get("motivo_perda"), "o motivo da perda") : null,
    proxima_acao: String(formData.get("proxima_acao") ?? "") || null,
    ...calculated,
    row_version: existing.data?.row_version ? Number(existing.data.row_version) + 1 : 1,
  };
  const result = existing.data
    ? await supabase.from("propostas").update(payload).eq("proposta_id", code).eq("versao", version).eq("row_version", originalVersion).select("row_version").maybeSingle()
    : await supabase.from("propostas").insert(payload);
  const { error } = result;
  if (error) throw new Error(error.message);
  if (existing.data && !result.data) throw new Error("A proposta foi atualizada por outra sessão. Recarregue e tente novamente.");
  revalidatePath("/propostas");
  revalidatePath("/dashboard");
  redirect(`/propostas/${encodeURIComponent(code)}`);
}

export async function reissueProposal(formData: FormData) {
  if (!hasSupabaseEnv()) throw new Error("Configure o Supabase antes de reemitir uma proposta.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const code = required(formData.get("proposta_id"), "o código da proposta");
  const version = Number(formData.get("versao"));
  const { data: newVersion, error } = await supabase.rpc("reemitir_proposta", { p_proposta_id: code, p_versao: version });
  if (error) throw new Error(error.message);
  revalidatePath("/propostas");
  revalidatePath("/dashboard");
  redirect(`/propostas/${encodeURIComponent(code)}?versao=${newVersion}`);
}
