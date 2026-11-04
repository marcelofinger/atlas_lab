export type Stage = "Qualificacao" | "Proposta" | "Negociacao" | "Ganho" | "Perdido";

export type Proposal = {
  owner_id: string;
  proposta_id: string;
  versao: number;
  vigente: boolean;
  cliente_id: string;
  vendedor_id: string;
  produto_id: string;
  regiao: string;
  canal: string;
  data_criacao: string;
  data_fechamento: string | null;
  validade: string | null;
  etapa: Stage;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  custo_total: number;
  aprovacao_desconto: string | null;
  probabilidade: number;
  condicao_pagamento: string;
  motivo_perda: string | null;
  proxima_acao: string | null;
  valor_bruto: number;
  valor_liquido: number;
  margem_pct: number;
  valor_ponderado: number;
  row_version: number;
  updated_at: string;
  clientes?: { empresa: string } | null;
  vendedores?: { nome: string } | null;
  produtos?: { nome: string } | null;
};

export type ProposalHistory = {
  id: string;
  proposta_id: string;
  versao: number;
  de: string | null;
  para: string | null;
  ocorrido_em: string;
  origem: string;
  ator: string | null;
};
