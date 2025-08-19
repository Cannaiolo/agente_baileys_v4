import { buildSummaryTable } from '../shared/summaryFormat.js'

export default function summaryPrompt(mensagem, resumoFinanceiro) {
  const lista = resumoFinanceiro?.by_category || []
  const tabela = buildSummaryTable(lista)

  return `
Você é um assistente financeiro que responde de forma humana, breve e amigável no WhatsApp.

Abaixo está a mensagem do usuário e os dados financeiros do mês. Crie um resumo claro e útil usando **formatação em Markdown**:

Mensagem do usuário:
"""${mensagem}"""

Dados financeiros:
${tabela}

Instruções:
- Comece com um parágrafo breve informando o total gasto no mês atual 
  - exemplo: "Em (mês atual) de 2025, você gastou um total de R$ XXXX").
- Liste os 3 maiores gastos por categoria em **bullet points**, no seguinte formato:
  - *Nome da categoria*: R$XXX,XX
- Se alguma categoria ultrapassou o orçamento, mostre uma mensagem de alerta destacando qual foi.
- Inclua uma tabela Markdown com todos os gastos por categoria (já fornecida acima).
- Finalize com uma frase simpática (ex: “Se precisar de mais detalhes, é só me chamar!”).
- Não invente dados e mantenha a resposta natural, como se estivesse ajudando uma pessoa de verdade.
`.trim()
}
