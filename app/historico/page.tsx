import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { getIdentity, getRecentHistory } from "@/lib/data";
import { dateTimeBR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { codigo } = await searchParams;
  let history = await getRecentHistory();
  if (codigo) history = history.filter((item) => item.proposta_id.toLowerCase().includes(codigo.toLowerCase()));
  return <AppShell email={identity.email}><section className="content"><div className="page-heading"><div><p className="eyebrow">Auditoria comercial</p><h1>Histórico</h1><p className="subtle">Alterações registradas por proposta, ator, origem e data.</p></div></div>
    <form action="/historico" className="filter-bar"><div className="search"><span>⌕</span><input name="codigo" placeholder="Filtrar por código" defaultValue={codigo ?? ""}/><button className="subtle-link" style={{ border: 0, background: "transparent" }}>Buscar</button></div><span className="subtle">Últimos {history.length} eventos</span></form>
    <article className="card history-card"><div className="timeline">{history.length ? history.map((item) => <div className="event" key={item.id}><span className="event-dot"/><div><div className="event-title"><Link className="code" href={`/propostas/${encodeURIComponent(item.proposta_id)}`}>{item.proposta_id} · v{item.versao}</Link> — {item.para || "Atualização registrada"}</div>{item.de && <div className="subtle" style={{ marginTop: 4 }}>Anterior: {item.de}</div>}<div className="event-meta">{dateTimeBR(item.ocorrido_em)} · origem {item.origem} · ator {item.ator?.slice(0, 8) ?? "Sistema"}</div></div></div>) : <div className="empty">Nenhum evento encontrado.</div>}</div></article>
  </section></AppShell>;
}
