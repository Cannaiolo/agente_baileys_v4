import fetch from 'node-fetch'

// Exportação default, nome em inglês
export default async function fetchResumo(userId, mesAno) {
  console.log('[Resumo API] Parâmetros recebidos:', { userId, mesAno }) // 👈 LOG CRÍTICO
  
  try {
    const url = process.env.WORKER_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: "get_expenses_summary", month: mesAno, userId })
    })
    if (!response.ok) {
      console.error('[Resumo API] Erro HTTP:', response.status)
      return null
    }

    const json = await response.json()
    return json
  } catch (error) {
    console.error('[Resumo API] Erro ao buscar dados:', error)
    return null
  }
}