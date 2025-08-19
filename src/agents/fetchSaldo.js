import fetch from 'node-fetch'

export default async function fetchSaldoMensal(userId, mesAno) {
  try {
    const url = process.env.WORKER_URL
    if (!url) return null

    const payload = { 
      operation: "get_monthly_balance", 
      month: mesAno, 
      userId 
    }
    
    console.log('[Saldo API] Enviando payload:', JSON.stringify(payload))

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('[Saldo API] Erro HTTP:', response.status)
      return null
    }

    const text = await response.text()
    console.log('[Saldo API] Resposta bruta:', text)
    
    try {
      const json = JSON.parse(text)
      console.log('[Saldo API] JSON parseado:', JSON.stringify(json, null, 2))
      return json
    } catch (parseError) {
      console.error('[Saldo API] Erro ao parsear JSON:', parseError)
      return null
    }
  } catch (error) {
    console.error('[Saldo API] Erro ao buscar dados:', error)
    return null
  }
}
