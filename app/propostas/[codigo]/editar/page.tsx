import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { ProposalForm } from "@/components/proposal-form";
import { getIdentity, getLookups, getProposal } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditProposalPage({ params }: { params: Promise<{ codigo: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { codigo } = await params;
  const proposal = await getProposal(decodeURIComponent(codigo));
  if (!proposal) notFound();
  if (["Ganho", "Perdido"].includes(proposal.etapa)) redirect(`/propostas/${encodeURIComponent(codigo)}`);
  const lookups = await getLookups();
  return <AppShell email={identity.email}><section className="content"><div className="page-heading"><div><p className="eyebrow">Cadastro</p><h1>Editar proposta</h1><p className="subtle">{proposal.proposta_id} · versão {proposal.versao}</p></div></div><ProposalForm proposal={proposal} lookups={lookups}/></section></AppShell>;
}
