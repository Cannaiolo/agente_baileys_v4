export default function classifierPrompt(mensagem) {
  return `
Você é um classificador de intenção para mensagens financeiras pessoais. Seu trabalho é identificar a intenção da mensagem a seguir e responder com **apenas uma das labels abaixo**, sem explicações ou variações.

Se a mensagem for exatamente igual a uma das labels, responda com ela mesma.

Labels possíveis:
registrar_despesa
registrar_receita
resumo_gastos
lista_ultimos_gastos 
setar_orcamento_categoria_mes
pergunta_saldo
outro

Mensagem:
"""${mensagem}"""

Resposta:
`.trim()
}