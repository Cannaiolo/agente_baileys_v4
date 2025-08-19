export function formatBRL(value) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const SUMMARY_TABLE_HEADER = '| Categoria | Gasto | Orçamento | % Usado |'
export const SUMMARY_TABLE_SEPARATOR = '|--->>>'

export function buildCategoryRows(list) {
  const arr = Array.isArray(list) ? list : []
  return arr.map(cat => {
    const categoria = cat?.categoria || '-'
    const total = formatBRL(cat?.total)
    const orcamento = formatBRL(cat?.orcamento)
    const percentual = cat?.percentual_usado != null ? `${cat.percentual_usado}%` : '0%'
    return `| ${categoria} | ${total} | ${orcamento} | ${percentual} |`
  }).join('\n')
}

export function buildSummaryTable(list) {
  const rows = buildCategoryRows(list)
  return `${SUMMARY_TABLE_HEADER}\n${SUMMARY_TABLE_SEPARATOR}\n${rows}`
}


