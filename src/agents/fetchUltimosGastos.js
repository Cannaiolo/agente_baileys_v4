import fetch from 'node-fetch'

// Exportação default, nome em inglês
export default async function fetchUltimosGastos(userId, limit = 5) {
  try {
    const url = process.env.WORKER_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'list_last_expenses', limite: limit, userId })
    })

    if (!response.ok) {
      console.error('[UltimosGastos API] Erro HTTP:', response.status)
      return []
    }

    const json = await response.json()
    // Espera-se um array de despesas; garanta consistência
    return Array.isArray(json) ? json : (json?.data || [])
  } catch (error) {
    console.error('[UltimosGastos API] Erro ao buscar dados:', error)
    return []
  }
}


