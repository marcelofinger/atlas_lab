import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { MetricCard } from "@/components/metric-card";
import { getGoals, getIdentity, getProposals } from "@/lib/data";
import { brl, percent, monthBR } from "@/lib/format";

export const dynamic = "force-dynamic";

const closeDate = (value: string | null) => value ? value.slice(0, 7) : "";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const params = await searchParams;
  const filters = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const [proposals, allProposals, goals] = await Promise.all([getProposals(filters), getProposals(), getGoals()]);
  const won = proposals.filter((p) => p.etapa === "Ganho");
  const lost = proposals.filter((p) => p.etapa === "Perdido");
  const closed = won.length + lost.length;
  const open = proposals.filter((p) => ["Qualificacao", "Proposta", "Negociacao"].includes(p.etapa));
  const totalWon = won.reduce((sum, p) => sum + p.valor_liquido, 0);
  const margin = totalWon ? won.reduce((sum, p) => sum + p.valor_liquido - p.custo_total, 0) / totalWon : null;
  const pipeline = open.reduce((sum, p) => sum + p.valor_liquido, 0);
  const weighted = open.reduce((sum, p) => sum + p.valor_liquido * p.probabilidade, 0);
  const novWon = won.filter((p) => closeDate(p.data_fechamento) === "2026-11").reduce((sum, p) => sum + p.valor_liquido, 0);
  const closedNov = won.filter((p) => closeDate(p.data_fechamento) === "2026-11");
  const novGoal = goals.find((goal) => String(goal.mes).slice(0, 7) === "2026-11")?.meta_vendas_ganhas ?? null;
  const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  const series = months.map((month) => ({ month, amount: won.filter((p) => closeDate(p.data_fechamento) === month).reduce((sum, p) => sum + p.valor_liquido, 0) }));
  const max = Math.max(1, ...series.map((item) => item.amount));
  const stageTotals = ["Qualificacao", "Proposta", "Negociacao"].map((stage) => ({ stage, value: open.filter((p) => p.etapa === stage).reduce((sum, p) => sum + p.valor_liquido, 0) }));
  const labels: Record<string, string> = { Qualificacao: "Qualificação", Proposta: "Proposta", Negociacao: "Negociação" };
  return <AppShell email={identity.email}><section className="content">
    <div className="page-heading"><div><p className="eyebrow">Visão geral</p><h1>Dashboard</h1><p className="subtle">Histórico: mai–out/2026 · Carteira vigente na data da consulta.</p></div><div className="badge proposta">Consulta em {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date())}</div></div>
    <form className="filter-bar" action="/dashboard"><div className="filters"><select className="select" name="vendedor" defaultValue={filters.vendedor ?? ""}><option value="">Todos os vendedores</option>{Array.from(new Set(allProposals.map((p) => p.vendedor_id))).map((id) => <option value={id} key={id}>{allProposals.find((p) => p.vendedor_id === id)?.vendedores?.nome ?? id}</option>)}</select><select className="select" name="regiao" defaultValue={filters.regiao ?? ""}><option value="">Todas as regiões</option>{Array.from(new Set(allProposals.map((p) => p.regiao))).map((value) => <option key={value}>{value}</option>)}</select><select className="select" name="canal" defaultValue={filters.canal ?? ""}><option value="">Todos os canais</option>{["Indicacao", "Inbound", "Outbound"].map((value) => <option key={value} value={value}>{value === "Indicacao" ? "Indicação" : value}</option>)}</select><select className="select" name="produto" defaultValue={filters.produto ?? ""}><option value="">Todos os produtos</option>{Array.from(new Set(allProposals.map((p) => p.produto_id))).map((id) => <option value={id} key={id}>{allProposals.find((p) => p.produto_id === id)?.produtos?.nome ?? id}</option>)}</select></div><button className="btn secondary">Aplicar filtros</button></form>
    <div className="grid metrics"><MetricCard label="Vendas ganhas · mai–out" value={brl(won.filter((p) => closeDate(p.data_fechamento) < "2026-11").reduce((sum, p) => sum + p.valor_liquido, 0))} note="Por data de fechamento · valores líquidos" icon="↗"/><MetricCard label="Atingimento · novembro" value={novGoal === null ? "—" : percent(novWon / Number(novGoal))} note={novGoal === null ? "Meta não cadastrada" : `${brl(novWon)} de ${brl(Number(novGoal))}`} icon="◎"/><MetricCard label="Taxa de ganho" value={closed ? percent(won.length / closed) : "—"} note={`${won.length + lost.length} propostas encerradas`} icon="◉"/><MetricCard label="Ticket médio ganho" value={won.length ? brl(totalWon / won.length) : "—"} note={`${won.length} vendas ganhas`} icon="◇"/></div>
    <div className="grid metrics" style={{ marginTop: -4 }}><MetricCard label="Margem ponderada ganha" value={margin === null ? "—" : percent(margin)} note="Calculada sobre valores agregados" icon="⌁"/><MetricCard label="Pipeline aberto" value={brl(pipeline)} note={`${open.length} propostas na carteira · alertas incluídos`} icon="▥"/><MetricCard label="Pipeline ponderado" value={brl(weighted)} note="Premissas didáticas por etapa" icon="◌"/><MetricCard label="Novembro · vendas ganhas" value={brl(novWon)} note={`${closedNov.length} propostas no mês · sem meta cadastrada`} icon="◷"/></div>
    <div className="grid panels"><article className="card chart-card"><div className="chart-head"><div><h2>Vendas ganhas ao longo do tempo</h2><p className="subtle">Histórico por mês de fechamento</p></div><span className="badge ganho">mai — nov 2026</span></div><div className="chart" aria-label="Vendas ganhas por mês">{series.map((item) => <div className="bar-col" key={item.month}><div className="bar-wrap"><div className={`bar ${item.month === "2026-11" ? "current" : ""}`} style={{ height: `${Math.max(5, item.amount / max * 100)}%` }}><span>{item.amount ? brl(item.amount) : "—"}</span></div></div><div className="chart-label">{monthBR(item.month)}</div></div>)}</div><div className="legend"><span><i className="dot dark"/>Mês corrente</span><span><i className="dot"/>Histórico</span><span>Vendas são valores líquidos; não representam faturamento ou caixa.</span></div></article>
      <article className="card chart-card"><h2>Carteira aberta por etapa</h2><p className="subtle">Exposição atual, não previsão garantida</p><div className="stage-list">{stageTotals.map((item) => <div className="stage-row" key={item.stage}><span className="stage-name">{labels[item.stage]}</span><div className="track"><div className={`fill ${item.stage === "Qualificacao" ? "lime" : ""}`} style={{ width: `${pipeline ? item.value / pipeline * 100 : 0}%` }}/></div><span className="stage-value">{brl(item.value)}</span></div>)}</div><div className="notice" style={{ marginTop: 26 }}><span>i</span><span>Propostas com alertas comerciais permanecem visíveis na carteira.</span></div></article>
    </div>
  </section></AppShell>;
}
