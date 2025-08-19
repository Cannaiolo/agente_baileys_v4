import fetch from 'node-fetch'
import classifierPrompt from '../prompts/classifierPrompt.js'

function mapToLabel(label) {
  if (!label) return 'outro';
  const normalize = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalized = normalize(label);
  // casa por inclusão de palavra/expressão normalizada (não exige igualdade exata)
  const matches = (value, list) => list.some((item) => value.includes(normalize(item)));
  // Mapeamento para registrar_despesa
  if (matches(normalized, [
    'registrar despesa',
    'registrar uma despesa',
    'adicionar despesa',
    'adicionar gasto',
    'lançar despesa',
    'cadastrar despesa',
    'cadastrar gasto',
    'anotar despesa',
    'anotar gasto',
    'informar despesa',
    'informar gasto',
    'salvar despesa',
    'salvar gasto',
    'marcar despesa',
    'marcar gasto',
    'registrar um gasto',
    'adicionar uma despesa',
    'adicionar um gasto',
    'lançar um gasto',
    'cadastrar uma despesa',
    'cadastrar um gasto',
    'anotar uma despesa',
    'anotar um gasto',
    'informar uma despesa',
    'informar um gasto',
    'salvar uma despesa',
    'salvar um gasto',
    'marcar uma despesa',
    'marcar um gasto',
    'gastei',
    'paguei',
    'comprei',
    'quero cadastrar um gasto',
    'registrar_despesa',
    'registrar despesa',
    // ✅ NOVAS PALAVRAS-CHAVE PARA CAPTURAR DESPESAS NATURAIS
    'fui no',
    'fui na',
    'comi no',
    'comi na',
    'tomei no',
    'tomei na',
    'peguei um',
    'peguei uma',
    'almocei no',
    'almocei na',
    'jantei no',
    'jantei na',
    'café no',
    'café na',
    'uber',
    '99',
    'taxi',
    'onibus',
    'metrô',
    'metro',
    'gasolina',
    'combustível',
    'combustivel',
    'farmácia',
    'farmacia',
    'drogaria',
    'posto',
    'shopping',
    'mall',
    'loja',
    'supermercado',
    'mercado',
    'restaurante',
    'lanchonete',
    'padaria',
    'açougue',
    'acougue',
    'hortifruti',
    'hortifrúti',
    'bebidas',
    'cerveja',
    'bar',
    'balada',
    'cinema',
    'teatro',
    'show',
    'ingresso',
    'passagem',
    'passagem de avião',
    'hotel',
    'hospedagem',
    'aluguel',
    'conta',
    'conta de luz',
    'conta de água',
    'conta de telefone',
    'internet',
    'netflix',
    'spotify',
    'assinatura',
    'mensalidade',
    'parcela',
    'prestação',
    'prestacao'
  ])) {
    return 'registrar_despesa';
  }
  // Mapeamento para registrar_receita
  if (matches(normalized, [
    'registrar receita',
    'adicionar receita',
    'cadastrar receita',
    'anotar receita',
    'recebi',
    'caiu',
    'entrou',
    'ganhei',
    'salário',
    'salario',
    'freela',
    'pix recebido',
    'transferência recebida',
    'transferencia recebida',
    'venda',
    'receita',
    'deposito',
    'depósito',
    'registrar_receita'
  ])) {
    return 'registrar_receita';
  }
  // Mapeamento para resumo_gastos
  if (matches(normalized, [
    'resumo de gastos do mês',
    'resumo de gastos',
    'resumo',
    'quero um resumo',
    'resumo do mes',
    'resumo do mês',
    'extrato',
    'balanço',
    'quanto gastei',
    'quanto sobrou',
    'status financeiro',
    'relatório',
    'resumo_gastos'
  ])) {
    return 'resumo_gastos';
  }
  // Mapeamento para lista_ultimos_gastos
  if (matches(normalized, [
    'lista ultimos gastos',
    'ultimos gastos',
    'ultimas despesas',
    'ultimas compras',
    'pagamentos recentes',
    'listar ultimos gastos',
    'listar despesas',
    'listar compras',
    'lista_ultimos_gastos'
  ])) {
    return 'lista_ultimos_gastos';
  }
  // Mapeamento para setar_orcamento_categoria_mes
  if (matches(normalized, [
    'setar orçamento categoria mes',
    'definir orçamento',
    'ajustar orçamento',
    'orçamento categoria',
    'configurar orçamento',
    'mudar orçamento',
    'limitar orçamento',
    'setar orçamento',
    'setar_orcamento_categoria_mes'
  ])) {
    return 'setar_orcamento_categoria_mes';
  }
  // Mapeamento para pergunta_saldo
  if (matches(normalized, [
    'pergunta saldo',
    'qual meu saldo',
    'quanto tenho',
    'saldo do mês',
    'saldo do mes',
    'quanto sobrou',
    'saldo atual',
    'balanço',
    'balanco',
    'pergunta_saldo'
  ])) {
    return 'pergunta_saldo';
  }
  // fallback
  return 'outro';
}

// Exportação default, nome em inglês
export default async function classifyMessage(msg) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  console.log('[classifyMessage] API Key configurada:', !!openaiApiKey)
  const prompt = classifierPrompt(msg)

  // 1) Fallback imediato e barato: tentar mapear a própria mensagem do usuário
  const quickMapped = mapToLabel(msg)
  if (quickMapped !== 'outro') {
    if (process.env.DEBUG) {
      console.log('[classifyMessage] quickMap da própria mensagem →', quickMapped)
    }
    return quickMapped
  }

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
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0
      })
    })

    const json = await response.json()
    if (process.env.DEBUG) {
      console.log('[classifyMessage] Resposta completa da API:', JSON.stringify(json, null, 2))
    }
    const rawContent = json.choices?.[0]?.message?.content
    if (process.env.DEBUG) {
      console.log(`[classifyMessage] Resposta bruta da IA:`, JSON.stringify(rawContent))
    }
    // 2) Extração robusta: tente encontrar explicitamente uma das labels permitidas no texto retornado
    const allowed = ['registrar_despesa', 'registrar_receita', 'resumo_gastos', 'lista_ultimos_gastos', 'setar_orcamento_categoria_mes', 'pergunta_saldo']
    const lowerRaw = (rawContent || '').toString().toLowerCase()
    const directHit = allowed.find(l => lowerRaw.includes(l))
    if (directHit) {
      if (process.env.DEBUG) console.log('[classifyMessage] directHit na resposta da IA →', directHit)
      return directHit
    }

    // 3) Fallback: limpar aspas/markdown e mapear
    const cleanContent = lowerRaw.replace(/[`"\s]+/g, ' ').trim()
    const mappedLabel = mapToLabel(cleanContent)
    return mappedLabel
  } catch (error) {
    console.error('[classifyMessage] Erro ao classificar mensagem:', error)
    return 'outro'
  }
}