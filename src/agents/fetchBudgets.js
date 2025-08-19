import fetch from 'node-fetch'

function parseBRLLikeToNumber(value) {
  if (typeof value === 'number') return value
  if (value == null) return 0
  const s = String(value).trim()
  // remove currency symbols and thousand separators, convert comma to dot
  const cleaned = s.replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function normalizeKey(name) {
  const base = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const singular = base.replace(/\sgastos?$/i, '').trim()
  if (/^(saude)$/.test(singular)) return 'saude'
  if (/^(mercado|supermercado|hiper(mercado)?)$/.test(singular)) return 'mercado'
  if (/^(lazer|entretenimento)$/.test(singular)) return 'lazer'
  if (/^(outros|outro|diversos|miscelanea)$/.test(singular)) return 'outros'
  return singular
}

export default async function fetchBudgets(userId, mesAno) {
  const url = process.env.WORKER_URL
  if (!url) return {}

  const operationsToTry = [
    { op: 'get_budgets', payload: { month: mesAno, userId } },
    { op: 'get_category_budgets', payload: { month: mesAno, userId } },
    { op: 'get_budgets_for_month', payload: { month: mesAno, userId } },
  ]

  for (const { op, payload } of operationsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: op, ...payload })
      })
      if (!response.ok) continue
      const json = await response.json()

      const items = Array.isArray(json) ? json : (json?.data || json?.rows || [])
      if (!Array.isArray(items) || items.length === 0) continue

      const map = {}
      for (const item of items) {
        const categoria = item.categoria || item.category || item.nome || item.name
        const orc = item.orcamento ?? item.budget ?? item.total ?? item.valor
        if (!categoria) continue
        map[normalizeKey(categoria)] = parseBRLLikeToNumber(orc)
      }
      // success on first op that returns something
      if (Object.keys(map).length > 0) return map
    } catch (e) {
      // try next op
    }
  }

  return {}
}


