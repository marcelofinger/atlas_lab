import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { getIdentity, getProposal, getProposalHistory, getProposalVersions } from "@/lib/data";
import { dateBR, dateTimeBR, money, percent, stageClass, stageLabel } from "@/lib/format";
import { reissueProposal } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ sucesso?: string; versao?: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { codigo } = await params;
  const { sucesso, versao: requestedVersion } = await searchParams;
  const code = decodeURIComponent(codigo);
  const proposal = await getProposal(code, requestedVersion ? Number(requestedVersion) : undefined);
  if (!proposal) notFound();
  const [history, versions] = await Promise.all([getProposalHistory(code), getProposalVersions(code)]);
  const alertDiscount = proposal.desconto_pct > 0.05;
  const alertMargin = proposal.margem_pct < 0.25 || proposal.valor_liquido === 0;
  const expired = Boolean(proposal.validade && proposal.validade < new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const alerts = [alertDiscount && "Desconto exige conferência de alçada no cadastro protegido.", alertMargin && "Margem abaixo do mínimo comercial de 25% ou valor líquido zero.", expired && "Validade expirada; aceite depende de revisão."];
  const editable = proposal.vigente && proposal.etapa !== "Ganho" && proposal.etapa !== "Perdido";
  return <AppShell email={identity.email}><section className="content">
    <div className="page-heading"><div><p className="eyebrow">Proposta · versão {proposal.versao}</p><h1>{proposal.proposta_id}</h1><p className="subtle">{proposal.clientes?.empresa ?? proposal.cliente_id} · {proposal.produtos?.nome ?? proposal.produto_id}</p></div><div className="header-tools"><span className={`badge ${stageClass[proposal.etapa]}`}>{stageLabel[proposal.etapa]}</span>{editable && <Link className="btn secondary" href={`/propostas/${encodeURIComponent(code)}/editar`}>Editar proposta</Link>}</div></div>
    {sucesso === "ganho" && <div className="notice" role="status"><span>✓</span><span>Ganho registrado pela função autorizada. A saída de resposta ficou pendente; nenhum e-mail foi enviado.</span></div>}
    {alerts.some(Boolean) && <div className="notice"><span>!</span><div><strong>Revisão comercial necessária</strong><div className="alert-list">{alerts.filter((text): text is string => Boolean(text)).map((text) => <div key={text} className="alert-item"><i className="alert-mark"/>{text}</div>)}</div></div></div>}
    <div className="grid detail-grid"><div className="grid" style={{ alignContent: "start"}}>
      <article className="card"><h2>Condições comerciais</h2><p className="subtle" style={{ marginBottom: 22 }}>Versão vigente na carteira atual</p><div className="details"><div><div className="detail-label">Valor bruto</div><div className="detail-value">{money(proposal.valor_bruto)}</div></div><div><div className="detail-label">Desconto</div><div className="detail-value">{percent(proposal.desconto_pct)}</div></div><div><div className="detail-label">Valor líquido</div><div className="detail-value">{money(proposal.valor_liquido)}</div></div><div><div className="detail-label">Margem estimada</div><div className="detail-value">{percent(proposal.margem_pct)}</div></div><div><div className="detail-label">Pagamento</div><div className="detail-value">{proposal.condicao_pagamento}</div></div><div><div className="detail-label">Validade</div><div className="detail-value">{dateBR(proposal.validade)}</div></div></div></article>
      <article className="card"><h2>Dados da oportunidade</h2><div className="details" style={{ marginTop: 20 }}><div><div className="detail-label">Responsável</div><div className="detail-value">{proposal.vendedores?.nome ?? proposal.vendedor_id}</div></div><div><div className="detail-label">Região</div><div className="detail-value">{proposal.regiao}</div></div><div><div className="detail-label">Canal</div><div className="detail-value">{proposal.canal === "Indicacao" ? "Indicação" : proposal.canal}</div></div><div><div className="detail-label">Criada em</div><div className="detail-value">{dateBR(proposal.data_criacao)}</div></div><div><div className="detail-label">Próxima ação</div><div className="detail-value">{proposal.proxima_acao || "—"}</div></div><div><div className="detail-label">Aprovação informada</div><div className="detail-value">{proposal.aprovacao_desconto || "—"}</div></div></div><div style={{ marginTop: 22 }}><div className="detail-label">Versões</div><div className="filters">{versions.map((item) => <Link key={item.versao} href={`/propostas/${encodeURIComponent(code)}${item.vigente ? "" : `?versao=${item.versao}`}`} className={`badge ${item.vigente ? "ganho" : "qualificacao"}`}>v{item.versao}{item.vigente ? " · vigente" : " · anterior"}</Link>)}</div></div></article>
    </div><div className="grid" style={{ alignContent: "start"}}>
      <article className="card"><h2>Ações permitidas</h2><p className="subtle" style={{ margin: "5px 0 18px"}}>As transições comerciais são validadas no banco.</p>{editable && <form action={reissueProposal} style={{ marginBottom: 12 }}><input type="hidden" name="proposta_id" value={proposal.proposta_id}/><input type="hidden" name="versao" value={proposal.versao}/><button className="btn secondary">Reemitir nova versão</button><p className="subtle" style={{ marginTop: 8 }}>A versão anterior será preservada no histórico.</p></form>}<p className="subtle">{proposal.etapa === "Ganho" ? "Ganho registrado; a versão fica imutável." : "O ganho só pode ser registrado após validar a mensagem de aceite e a política comercial. Esse processamento não está habilitado nesta etapa."}</p>{proposal.etapa === "Perdido" && <div className="notice"><span>i</span><span>Reabertura exige revisão comercial.</span></div>}</article>
      <article className="card"><h2>Histórico</h2><div className="timeline">{history.length ? history.map((item) => <div className="event" key={item.id}><span className="event-dot"/><div><div className="event-title">{item.para ?? "Registro da proposta"}</div><div className="event-meta">{dateTimeBR(item.ocorrido_em)} · {item.origem === "ui" ? "CRM" : item.origem} · {item.ator?.slice(0, 8) ?? "Sistema"}</div></div></div>) : <p className="subtle" style={{ marginTop: 18 }}>Ainda não há eventos registrados.</p>}</div><Link href={`/historico?codigo=${encodeURIComponent(code)}`} className="subtle-link">Ver histórico completo →</Link></article>
    </div></div>
  </section></AppShell>;
}
