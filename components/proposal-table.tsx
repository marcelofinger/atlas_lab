import Link from "next/link";
import type { Proposal } from "@/lib/types";
import { dateBR, initials, money, stageClass, stageLabel } from "@/lib/format";

export function ProposalTable({ proposals }: { proposals: Proposal[] }) {
  if (proposals.length === 0) return <div className="empty">Nenhuma proposta encontrada para este recorte.</div>;
  return <div className="table-scroll"><table><thead><tr><th>Proposta</th><th>Cliente</th><th>Valor líquido</th><th>Responsável</th><th>Etapa</th><th>Próxima ação</th><th>Validade</th></tr></thead><tbody>
    {proposals.map((proposal) => {
      const name = proposal.vendedores?.nome ?? proposal.vendedor_id;
      const alert = proposal.desconto_pct > .05 || proposal.margem_pct < .25 || proposal.valor_liquido === 0;
      return <tr key={`${proposal.proposta_id}-${proposal.versao}`}>
        <td><Link className="code" href={`/propostas/${encodeURIComponent(proposal.proposta_id)}`}>{proposal.proposta_id} <span style={{ color: "#89958F", fontWeight: 400 }}>v{proposal.versao}</span></Link>{alert && <div style={{ marginTop: 5 }}><span className="badge alerta">Revisão comercial</span></div>}</td>
        <td>{proposal.clientes?.empresa ?? proposal.cliente_id}</td><td className="money">{money(proposal.valor_liquido)}</td>
        <td><div className="person"><span className="person-mark">{initials(name)}</span>{name}</div></td>
        <td><span className={`badge ${stageClass[proposal.etapa]}`}>{stageLabel[proposal.etapa]}</span></td>
        <td>{proposal.proxima_acao || "—"}</td><td>{dateBR(proposal.validade)}</td>
      </tr>;
    })}
  </tbody></table></div>;
}
