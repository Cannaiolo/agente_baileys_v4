import fetch from 'node-fetch'
import expensePrompt from '../prompts/expensePrompt.js'

export default async function extractExpense(mensagem, usuarioId) {
  const openaiApiKey = process.env.OPENAI_API_KEY

  const messages = [
    { role: 'system', content: expensePrompt(mensagem) },
    {
      role: 'user',
      content: `Mensagem recebida: """${mensagem}"""\nUsuário: ${usuarioId}\nRetorne apenas o JSON.`
    }
  ]

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0
    })
  })

  const json = await response.json()
  const raw = json.choices?.[0]?.message?.content || '{}'

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
