import Link from "next/link";
import { saveProposal } from "@/app/actions";
import type { Proposal } from "@/lib/types";
import { stageLabel } from "@/lib/format";

type Lookups = Awaited<ReturnType<typeof import("@/lib/data").getLookups>>;

export function ProposalForm({ proposal, lookups }: { proposal?: Proposal | null; lookups: Lookups }) {
  const editing = Boolean(proposal);
  return <form action={saveProposal} className="card form-card">
    <div className="form-grid grid">
      <p className="form-section field-wide">Identificação e cliente</p>
      <div className="field"><label htmlFor="proposta_id">Código da proposta</label><input className="field-input" id="proposta_id" name="proposta_id" defaultValue={proposal?.proposta_id ?? ""} required readOnly={editing} placeholder="ATL-2026-0121" /></div>
      <div className="field"><label htmlFor="versao">Versão</label><input className="field-input" id="versao" name="versao" type="number" min="1" defaultValue={proposal?.versao ?? 1} readOnly={editing} required /></div>
      <div className="field"><label htmlFor="cliente_id">Cliente</label><select className="field-select" id="cliente_id" name="cliente_id" defaultValue={proposal?.cliente_id ?? ""} required><option value="">Selecione</option>{lookups.clientes.map((item) => <option key={item.cliente_id} value={item.cliente_id}>{item.empresa}</option>)}</select></div>
      <div className="field"><label htmlFor="vendedor_id">Responsável</label><select className="field-select" id="vendedor_id" name="vendedor_id" defaultValue={proposal?.vendedor_id ?? ""} required><option value="">Selecione</option>{lookups.vendedores.map((item) => <option key={item.vendedor_id} value={item.vendedor_id}>{item.nome}</option>)}</select></div>
      <div className="field"><label htmlFor="produto_id">Produto ou serviço</label><select className="field-select" id="produto_id" name="produto_id" defaultValue={proposal?.produto_id ?? ""} required><option value="">Selecione</option>{lookups.produtos.map((item) => <option key={item.produto_id} value={item.produto_id}>{item.nome}</option>)}</select></div>
      <div className="field"><label htmlFor="canal">Canal</label><select id="canal" name="canal" className="field-select" defaultValue={proposal?.canal ?? "Indicacao"}><option value="Indicacao">Indicação</option><option value="Inbound">Inbound</option><option value="Outbound">Outbound</option></select></div>
      <div className="field"><label htmlFor="regiao">Região do responsável</label><input className="field-input" id="regiao" value={proposal?.regiao ?? "Definida pelo responsável selecionado"} readOnly aria-readonly="true"/><small>A região vem do cadastro do vendedor.</small></div>
      <p className="form-section field-wide">Condições comerciais</p>
      <div className="field"><label htmlFor="quantidade">Quantidade</label><input className="field-input" id="quantidade" name="quantidade" type="number" min="1" step="1" defaultValue={proposal?.quantidade ?? 1} required /></div>
      <div className="field"><label htmlFor="preco_unitario">Preço unitário (R$)</label><input className="field-input" id="preco_unitario" name="preco_unitario" type="number" min="0.01" step="0.01" defaultValue={proposal?.preco_unitario ?? ""} required /></div>
      <div className="field"><label htmlFor="desconto_pct">Desconto (%)</label><input className="field-input" id="desconto_pct" name="desconto_pct" type="number" min="0" max="100" step="0.01" defaultValue={proposal ? proposal.desconto_pct * 100 : 0} required /><small>Desconto acima de 5% exige referência validada no cadastro protegido.</small></div>
      <div className="field"><label htmlFor="custo_total">Custo total (R$)</label><input className="field-input" id="custo_total" name="custo_total" type="number" min="0" step="0.01" defaultValue={proposal?.custo_total ?? ""} required /></div>
      <div className="field"><label htmlFor="aprovacao_desconto">Referência de aprovação</label><input className="field-input" id="aprovacao_desconto" value={proposal?.aprovacao_desconto ?? "Sem referência cadastrada"} readOnly aria-readonly="true"/><small>O registro protegido é mantido pela alçada autorizada.</small></div>
      <div className="field"><label htmlFor="condicao_pagamento">Condição de pagamento</label><input className="field-input" id="condicao_pagamento" name="condicao_pagamento" defaultValue={proposal?.condicao_pagamento ?? "50% no aceite e 50% na entrega"} required /></div>
      <p className="form-section field-wide">Datas, etapa e próximo passo</p>
      <div className="field"><label htmlFor="data_criacao">Data de criação</label><input className="field-input" id="data_criacao" name="data_criacao" type="date" defaultValue={proposal?.data_criacao ?? new Date().toISOString().slice(0, 10)} required /></div>
      <div className="field"><label htmlFor="validade">Validade</label><input className="field-input" id="validade" name="validade" type="date" defaultValue={proposal?.validade ?? ""} required /></div>
      <div className="field"><label htmlFor="etapa">Etapa</label><select className="field-select" id="etapa" name="etapa" defaultValue={proposal?.etapa ?? "Qualificacao"}>{["Qualificacao", "Proposta", "Negociacao", "Perdido"].map((stage) => <option key={stage} value={stage}>{stageLabel[stage]}</option>)}</select><small>Ganho só pela função autorizada do CRM.</small></div>
      <div className="field"><label htmlFor="data_fechamento">Data de fechamento (para Perdido)</label><input className="field-input" id="data_fechamento" name="data_fechamento" type="date" defaultValue={proposal?.data_fechamento ?? ""} /></div>
      <div className="field"><label htmlFor="motivo_perda">Motivo da perda</label><select className="field-select" id="motivo_perda" name="motivo_perda" defaultValue={proposal?.motivo_perda ?? ""}><option value="">Selecione quando Perdido</option><option value="Preco">Preço</option><option value="Prazo">Prazo</option><option value="Concorrente">Concorrente</option></select></div>
      <div className="field field-wide"><label htmlFor="proxima_acao">Próxima ação</label><textarea className="field-textarea" id="proxima_acao" name="proxima_acao" defaultValue={proposal?.proxima_acao ?? ""} placeholder="Descreva o próximo passo comercial" /></div>
    </div>
    {proposal && <input type="hidden" name="row_version" value={proposal.row_version}/>}
    <div className="form-actions"><Link href={proposal ? `/propostas/${proposal.proposta_id}` : "/propostas"} className="subtle-link">Cancelar</Link><button className="btn">{editing ? "Salvar alterações" : "Cadastrar proposta"} <span>→</span></button></div>
  </form>;
}
