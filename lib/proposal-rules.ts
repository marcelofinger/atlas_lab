export function calcProposal(input: { quantity: number; unitPrice: number; discount: number; totalCost: number; probability?: number }) {
  const { quantity, unitPrice, discount, totalCost, probability = 0 } = input;
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantidade deve ser um número inteiro maior que zero.");
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Preço unitário deve ser maior que zero.");
  if (!Number.isFinite(totalCost) || totalCost < 0) throw new Error("Custo total não pode ser negativo.");
  if (!Number.isFinite(discount) || discount < 0 || discount > 1) throw new Error("Desconto deve ficar entre 0% e 100%.");
  const valor_bruto = Math.round(quantity * unitPrice * 100) / 100;
  const valor_liquido = Math.round(valor_bruto * (1 - discount) * 100) / 100;
  const margem_pct = valor_liquido > 0 ? (valor_liquido - totalCost) / valor_liquido : 0;
  return { valor_bruto, valor_liquido, margem_pct, valor_ponderado: Math.round(valor_liquido * probability * 100) / 100 };
}
