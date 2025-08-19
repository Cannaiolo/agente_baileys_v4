import fetch from 'node-fetch'
import summaryPrompt from '../prompts/summaryPrompt.js'
import { formatBRL, buildSummaryTable } from '../shared/summaryFormat.js'

function buildLocalSummary(content, resumo) {
  const list = Array.isArray(resumo?.by_category) ? resumo.by_category : []
  const total = Number(resumo?.total || list.reduce((acc, c) => acc + (Number(c.total) || 0), 0))
  const ordered = [...list].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
  const top3 = ordered.slice(0, 3)
  const overruns = list.filter((c) => Number(c.orcamento) > 0 && Number(c.total) > Number(c.orcamento))

  const bullets = top3
    .map((c) => `- ${c.categoria || '-'}: ${formatBRL(c.total)}`)
    .join('\n')

  const table = buildSummaryTable(list)

  const alerta = overruns.length > 0
    ? `\n\nAtenção: ${overruns.map((c) => c.categoria || '-').join(', ')} acima do orçamento.`
    : ''

  const header = [
    `📊 Neste período, você gastou um total de ${formatBRL(total)}.`,
    '',
    'Maiores categorias:',
    bullets || '- (sem dados)'
  ].join('\n')

  return `${header}\n\n${table}\n\nSe precisar de mais detalhes, é só me chamar!${alerta}`
}

// Exportação default, nome em inglês
export default async function generateSummary(content, resumo) {
  const openaiApiKey = process.env.OPENAI_API_KEY

  // Normaliza estrutura para garantir que vem { total, data: [...] }
  const resumoNormalizado = Array.isArray(resumo)
    ? { total: resumo.reduce((acc, r) => acc + (r.total || 0), 0), data: resumo }
    : (resumo || {})

  // Garante que o prompt receba "by_category" quando vier em outro formato
  const resumoFormatado = {
    total: resumoNormalizado.total || 0,
    by_category:
      resumoNormalizado.by_category ||
      resumoNormalizado.data ||
      [],
  }

  // Fallback local caso não haja chave
  if (!openaiApiKey) {
    if (process.env.DEBUG) console.warn('[generateSummary] OPENAI_API_KEY ausente. Usando fallback local.')
    return buildLocalSummary(content, resumoFormatado)
  }

  const prompt = summaryPrompt(content, resumoFormatado)

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente financeiro que gera resumos de gastos para o usuário do WhatsApp.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    })

    const json = await response.json()
    if (!response.ok || json?.error) {
      if (process.env.DEBUG) console.error('[generateSummary] Erro da API OpenAI:', json)
      return buildLocalSummary(content, resumoFormatado)
    }

    const text = json.choices?.[0]?.message?.content?.trim()
    if (text) return text
    return buildLocalSummary(content, resumoFormatado)
  } catch (e) {
    console.error('[generateSummary] Falha ao chamar OpenAI:', e)
    return buildLocalSummary(content, resumoFormatado)
  }
}
