import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { ProposalTable } from "@/components/proposal-table";
import { getIdentity, getProposals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const params = await searchParams;
  const filters = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const [proposals, allProposals] = await Promise.all([getProposals(filters), getProposals()]);
  if (filters.ordenar === "valor_desc") proposals.sort((a, b) => b.valor_liquido - a.valor_liquido);
  if (filters.ordenar === "valor_asc") proposals.sort((a, b) => a.valor_liquido - b.valor_liquido);
  if (filters.ordenar === "codigo") proposals.sort((a, b) => a.proposta_id.localeCompare(b.proposta_id, "pt-BR"));
  const parsedPage = Number(filters.page ?? 1);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(proposals.length / pageSize));
  const rows = proposals.slice((page - 1) * pageSize, page * pageSize);
  const search = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "page" && Boolean(value)) as [string, string][]);
  return <AppShell email={identity.email}><section className="content">
    <div className="page-heading"><div><p className="eyebrow">Carteira comercial</p><h1>Propostas</h1><p className="subtle">Busque e acompanhe as oportunidades da sua carteira.</p></div><Link className="btn" href="/propostas/nova">＋ Nova proposta</Link></div>
    <form action="/propostas" className="table-toolbar card" style={{ marginBottom: 14 }}><div className="search"><span aria-hidden="true">⌕</span><input name="q" placeholder="Buscar pelo código da proposta" defaultValue={filters.q ?? ""}/><button className="subtle-link" style={{ border: 0, background: "transparent" }}>Buscar</button></div><div className="filters"><select className="select" name="etapa" defaultValue={filters.etapa ?? ""}><option value="">Todas as etapas</option>{["Qualificacao","Proposta","Negociacao","Ganho","Perdido"].map((value) => <option key={value} value={value}>{value === "Qualificacao" ? "Qualificação" : value === "Negociacao" ? "Negociação" : value}</option>)}</select><select className="select" name="vendedor" defaultValue={filters.vendedor ?? ""}><option value="">Todos os responsáveis</option>{Array.from(new Set(allProposals.map((p) => p.vendedor_id))).map((id) => <option key={id} value={id}>{allProposals.find((p) => p.vendedor_id === id)?.vendedores?.nome ?? id}</option>)}</select><select className="select" name="regiao" defaultValue={filters.regiao ?? ""}><option value="">Todas as regiões</option>{Array.from(new Set(allProposals.map((p) => p.regiao))).map((value) => <option key={value}>{value}</option>)}</select><select className="select" name="canal" defaultValue={filters.canal ?? ""}><option value="">Todos os canais</option>{["Indicacao","Inbound","Outbound"].map((value) => <option key={value} value={value}>{value === "Indicacao" ? "Indicação" : value}</option>)}</select><select className="select" name="produto" defaultValue={filters.produto ?? ""}><option value="">Todos os produtos</option>{Array.from(new Set(allProposals.map((p) => p.produto_id))).map((id) => <option key={id} value={id}>{allProposals.find((p) => p.produto_id === id)?.produtos?.nome ?? id}</option>)}</select><select className="select" name="ordenar" defaultValue={filters.ordenar ?? "recentes"}><option value="recentes">Mais recentes</option><option value="valor_desc">Maior valor</option><option value="valor_asc">Menor valor</option><option value="codigo">Código</option></select></div></form>
    <article className="card table-card"><div className="table-toolbar"><p className="table-title">Carteira atual <span style={{ color: "#7B8881", fontWeight: 400 }}>· {proposals.length} registros</span></p><span className="subtle">Somente versões vigentes</span></div><ProposalTable proposals={rows}/><div className="pagination"><span>Exibindo {proposals.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, proposals.length)} de {proposals.length} propostas</span><div className="pagination-actions"><Link href={`/propostas?${new URLSearchParams([...search, ["page", String(Math.max(1, page - 1))]])}`}><button aria-label="Página anterior">‹</button></Link>{Array.from({ length: Math.min(5, pages) }, (_, index) => Math.max(1, Math.min(pages - 4, page - 2)) + index).map((number) => <Link href={`/propostas?${new URLSearchParams([...search, ["page", String(number)]])}`} key={number}><button className={number === page ? "on" : ""}>{number}</button></Link>)}<Link href={`/propostas?${new URLSearchParams([...search, ["page", String(Math.min(pages, page + 1))]])}`}><button aria-label="Próxima página">›</button></Link></div></div></article>
  </section></AppShell>;
}
