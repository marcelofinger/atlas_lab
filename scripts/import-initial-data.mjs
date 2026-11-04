import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function loadLocalEnv(path) {
  return readFile(path, "utf8").then((content) => {
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }).catch(() => {});
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ";" && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  const [headers, ...records] = rows;
  return records.map((values) => Object.fromEntries(headers.map((key, index) => [key.trim(), (values[index] ?? "").trim()])));
}

function num(value, fallback = 0) {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Valor numérico inválido no CSV: ${value}`);
  return parsed;
}

async function main() {
  await loadLocalEnv(resolve(process.cwd(), ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const ownerId = process.env.ATLAS_IMPORT_OWNER_ID;
  if (!url || !key || !ownerId) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e ATLAS_IMPORT_OWNER_ID no ambiente local.");
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error("ATLAS_IMPORT_OWNER_ID precisa ser o UUID do usuário que receberá a carga.");

  const dataDir = resolve(process.cwd(), "../../Atlas_CRM_Transferencia/dados");
  const names = ["cadastros/clientes.csv", "cadastros/vendedores.csv", "cadastros/produtos.csv", "cadastros/metas.csv", "vendas_atlas_tratada.csv"];
  const contents = await Promise.all(names.map((name) => readFile(resolve(dataDir, name), "utf8")));
  const digest = createHash("sha256").update(contents.join("\n--ATLAS-BATCH--\n")).digest("hex");
  const batchId = `atlas-inicial-${digest.slice(0, 12)}`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const request = async (path, options = {}) => {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return response.status === 204 ? null : response.json();
  };
  const batches = await request(`import_batches?owner_id=eq.${ownerId}&sha256=eq.${digest}&select=batch_id`);
  if (batches.length) { console.log(`Lote ${batches[0].batch_id} já importado; nenhuma alteração feita.`); return; }

  const parsed = contents.map(parseCsv);
  const specs = [
    ["clientes", parsed[0].map((r) => ({ owner_id: ownerId, cliente_id: r.cliente_id, empresa: r.empresa, contato: r.contato || null, email_aceite: r.email_aceite || null, segmento: r.segmento || null, regiao: r.regiao || null })), "cliente_id"],
    ["vendedores", parsed[1].map((r) => ({ owner_id: ownerId, vendedor_id: r.vendedor_id, nome: r.nome, regiao: r.regiao })), "vendedor_id"],
    ["produtos", parsed[2].map((r) => ({ owner_id: ownerId, produto_id: r.produto_id, nome: r.nome, preco_unitario: num(r.preco_unitario), custo_unitario: num(r.custo_unitario), escopo: r.escopo || null })), "produto_id"],
    ["metas", parsed[3].map((r) => ({ owner_id: ownerId, mes: r.mes, meta_vendas_ganhas: num(r.meta_vendas_ganhas) })), "mes"],
    ["propostas", parsed[4].map((r) => ({ owner_id: ownerId, proposta_id: r.proposta_id, versao: num(r.versao, 1), vigente: true, cliente_id: r.cliente_id, vendedor_id: r.vendedor_id, produto_id: r.produto_id, regiao: r.regiao, canal: r.canal, data_criacao: r.data_criacao, data_fechamento: r.data_fechamento || null, validade: r.validade || null, etapa: r.etapa, quantidade: num(r.quantidade), preco_unitario: num(r.preco_unitario), desconto_pct: num(r.desconto_pct), custo_total: num(r.custo_total), aprovacao_desconto: r.aprovacao_desconto || null, probabilidade: num(r.probabilidade), condicao_pagamento: r.condicao_pagamento, motivo_perda: r.motivo_perda || null, proxima_acao: r.proxima_acao || null, valor_bruto: num(r.valor_bruto), valor_liquido: num(r.valor_liquido), margem_pct: num(r.margem_pct), valor_ponderado: num(r.valor_ponderado), row_version: 1 })), "proposta_id", "versao"],
  ];
  const report = { batch_id: batchId, sha256: digest, inserted: {}, unchanged: {}, conflicts: [] };
  for (const [table, rows, ...keys] of specs) {
    const existing = await request(`${table}?owner_id=eq.${ownerId}&select=*`);
    const byKey = new Map(existing.map((row) => [keys.map((key) => row[key]).join("|"), row]));
    const insert = [];
    let unchanged = 0;
    for (const row of rows) {
      const keyValue = keys.map((key) => row[key]).join("|");
      const prior = byKey.get(keyValue);
      if (!prior) { insert.push(row); continue; }
      const comparable = Object.fromEntries(Object.entries(prior).filter(([key]) => key in row));
      if (JSON.stringify(comparable) === JSON.stringify(row)) unchanged += 1;
      else report.conflicts.push({ table, key: keyValue });
    }
    for (let i = 0; i < insert.length; i += 100) await request(table, { method: "POST", body: JSON.stringify(insert.slice(i, i + 100)), headers: { Prefer: "return=minimal" } });
    report.inserted[table] = insert.length;
    report.unchanged[table] = unchanged;
  }
  await request("import_batches", { method: "POST", body: JSON.stringify({ owner_id: ownerId, batch_id: batchId, sha256: digest, row_count: parsed[4].length, result: report }), headers: { Prefer: "return=minimal" } });
  console.log(JSON.stringify(report, null, 2));
  if (report.conflicts.length) process.exitCode = 2;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
