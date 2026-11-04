import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand";
import { ProposalForm } from "@/components/proposal-form";
import { getIdentity, getLookups } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const lookups = await getLookups();
  return <AppShell email={identity.email}><section className="content"><div className="page-heading"><div><p className="eyebrow">Cadastro</p><h1>Nova proposta</h1><p className="subtle">Registre condições comerciais e o próximo passo.</p></div></div><ProposalForm lookups={lookups}/></section></AppShell>;
}
