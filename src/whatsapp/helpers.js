// Coleção de utilitários puros para reduzir o tamanho de startSock.js

import extractExpense from '../agents/extractExpense.js'

// --- Pivot e sessão ---
export function isStrongPivot(texto, PIVOT_KEYWORDS) {
  const lower = (texto || '').toLowerCase()
  return PIVOT_KEYWORDS.some((k) => lower.includes(k))
}

export function ensureSessionStruct(session) {
  const bufferText = Array.isArray(session?.bufferText) ? session.bufferText : []
  const advisoryHistory = Array.isArray(session?.advisoryHistory) ? session.advisoryHistory : []
  const dadosParciais = session?.dadosParciais || {}
  return { ...session, bufferText, advisoryHistory, dadosParciais }
}

export function updateAdvisoryHistory(sessionObj, advisoryLabel, INTENT_STICKINESS) {
  if (!advisoryLabel) return sessionObj
  if (advisoryLabel !== 'registrar_despesa') {
    const history = [...(sessionObj.advisoryHistory || []), advisoryLabel]
    const trimmed = history.slice(-INTENT_STICKINESS)
    return { ...sessionObj, advisoryHistory: trimmed }
  }
  return { ...sessionObj, advisoryHistory: [] }
}

export function shouldPivot(content, sessionObj, inFlow, PIVOT_KEYWORDS, INTENT_STICKINESS) {
  if (inFlow) return isStrongPivot(content, PIVOT_KEYWORDS)
  return isStrongPivot(content, PIVOT_KEYWORDS) || ((sessionObj.advisoryHistory?.length || 0) >= INTENT_STICKINESS)
}

// --- Helpers genéricos ---
export function isEmptyValue(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}
export function coalesce(newValue, oldValue) {
  return isEmptyValue(newValue) ? oldValue : newValue
}
export function normalizeNoAccentsLower(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
export function formatCurrencyBRL(value) {
  const num = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.'))
  if (!Number.isFinite(num)) return 'R$ 0,00'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function formatDateDDMMYYYY(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return ''
  const d = String(dateObj.getDate()).padStart(2, '0')
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const y = dateObj.getFullYear()
  return `${d}/${m}/${y}`
}

// Formata valores de data variados (Date, ISO, dd/mm/yyyy, yyyy-mm-dd) para DD-MM-YYYY
export function formatAnyDateToDDMMYYYY(input, separator = '-') {
  const sep = typeof separator === 'string' && separator.length > 0 ? separator : '-'
  let dateObj = null
  if (input instanceof Date) {
    dateObj = input
  } else if (typeof input === 'string') {
    const s = input.trim()
    // dd/mm/yyyy
    const m1 = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/)
    if (m1) {
      const d = Number(m1[1])
      const m = Number(m1[2])
      const y = Number(m1[3])
      dateObj = new Date(y, m - 1, d)
    } else {
      // Tenta parser nativo (ISO como 2025-08-10T03:00:00.000Z, yyyy-mm-dd, etc.)
      const t = Date.parse(s)
      if (!Number.isNaN(t)) dateObj = new Date(t)
    }
  }
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj?.getTime?.())) {
    return String(input || '')
  }
  const dd = String(dateObj.getDate()).padStart(2, '0')
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const yyyy = dateObj.getFullYear()
  return `${dd}${sep}${mm}${sep}${yyyy}`
}
export function parseDateFromText(texto) {
  const lower = (texto || '').toLowerCase()
  if (lower.includes('hoje')) return formatDateDDMMYYYY(new Date())
  if (lower.includes('ontem')) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return formatDateDDMMYYYY(d)
  }
  const m = (texto || '').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const dd = String(parseInt(m[1], 10)).padStart(2, '0')
    const mm = String(parseInt(m[2], 10)).padStart(2, '0')
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${dd}/${mm}/${year}`
  }
  return ''
}
export function parseCurrencyToNumber(input) {
  if (typeof input === 'number') return input
  const str = String(input || '')
  const match = str.match(/\d+[\.,]?\d*/)
  if (!match) return null
  const numeric = match[0].replace(/\./g, '').replace(',', '.')
  const num = Number(numeric)
  return Number.isFinite(num) ? num : null
}
export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// --- Estabelecimento e categoria ---
export const KNOWN_ESTABELECIMENTOS = [
  'angeloni',
  'supermercado angeloni',
  'supermercados angeloni',
  'gaivotas',
  'supermercado gaivotas',
  'beto',
  'supermercado beto',
]
export function extractEstabelecimentoFromText(texto) {
  const t = String(texto || '')
  const patterns = [
    /\bno\s+estabelecimento\s+([^\n,.;]+)/i,
    /\bna\s+([^\n,.;]+)/i, // prioriza 'na ...' antes de 'no ...'
    /\bno\s+([^\n,.;]+)/i,
    /\bem\s+([^\n,.;]+)/i,
  ]
  const paymentLike = /cart[aã]o|debito|d[eé]bito|credito|cr[eé]dito|pix|dinheiro|transfer[eê]ncia|ted|doc/i
  const temporalLike = /\b(hoje|ontem|agora)\b/i
  for (const re of patterns) {
    const m = t.match(re)
    if (m && m[1]) {
      let candidate = m[1].trim()
      // se for forma de pagamento, ignora e continua procurando
      if (paymentLike.test(candidate)) continue
      // remove termos temporais residuais ao final
      candidate = candidate.replace(/\b(hoje|ontem|agora)\b$/i, '').trim()
      if (candidate) return candidate
    }
  }
  return ''
}
export function matchKnownEstabelecimento(texto) {
  const lowerText = String(texto || '').toLowerCase()
  for (const name of KNOWN_ESTABELECIMENTOS) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i')
    const m = lowerText.match(re)
    if (m) {
      const idx = lowerText.indexOf(m[0].toLowerCase())
      if (idx >= 0) {
        return texto.substr(idx, m[0].length)
      }
      return name
    }
  }
  return ''
}
export function inferCategoriaFromEstabelecimento(est) {
  const s = (est || '').toLowerCase()
  if (!s) return ''
  if (/(supermercado|mercado|hiper|angeloni|gaivotas|beto|carrefour|extra|big|assai|assaí)/.test(s)) return 'mercado'
  if (/(farm[aá]cia|drogaria|droga ?raia|pague menos|drogasil)/.test(s)) return 'saúde'
  if (/(uber|99|cabify|taxi|táxi|ônibus|onibus|metr[oô]|metro)/.test(s)) return 'transporte'
  if (/(posto|gasolina|combust[ií]vel)/.test(s)) return 'transporte'
  if (/(restaurante|lanchonete|padaria|caf[eé]|bar|pizza|sushi|burger|mc\s?donald|bk|kfc)/.test(s)) return 'alimentação'
  if (/(cinema|show|teatro|balada)/.test(s)) return 'lazer'
  if (/(escola|col[eé]gio|colegio|faculdade|universidade|curso|mensalidade|matr[ií]cula)/.test(s)) return 'educação'
  return ''
}

export function inferCategoriaFromText(texto) {
  const t = normalizeNoAccentsLower(texto)
  if (/(escola|colegio|faculdade|universidade|curso|mensalidade|matricula)/.test(t)) return 'educação'
  return ''
}
export function inferFormaPagamentoFromText(texto) {
  const t = normalizeNoAccentsLower(texto)
  if (t.includes('cartao de debito') || t.includes('cartao debito') || t.includes('debito')) return 'cartão de débito'
  if (t.includes('cartao de credito') || t.includes('cartao credito') || t.includes('credito')) return 'cartão de crédito'
  if (t.includes('pix')) return 'pix'
  if (t.includes('transferencia') || t.includes('transferência') || t.includes('ted') || t.includes('doc')) return 'transferência'
  if (t.includes('dinheiro')) return 'dinheiro'
  return ''
}
export function normalizeCategoriaInput(texto) {
  const t = normalizeNoAccentsLower(String(texto || '').trim())
  if (!t) return ''
  const singular = t.replace(/\sgastos?$/, '').trim()
  if (/^(mercado|supermercado|hiper(mercado)?)$/.test(singular)) return 'mercado'
  if (/^(saude|farmacia|drogaria)$/.test(singular)) return 'saúde'
  if (/^(restaurante|lanchonete|padaria|comida|alimentacao|alimentação|bar|pizza|sushi|burger|mc\s?donald|bk|kfc)$/.test(singular)) return 'alimentação'
  if (/^(transporte|uber|99|taxi|onibus|oníbus|ônibus|metro|metrô|gasolina|combustivel|combustível)$/.test(singular)) return 'transporte'
  if (/^(lazer|entretenimento|cinema|show|teatro|balada)$/.test(singular)) return 'lazer'
  if (/^(educacao|educação|escola|colegio|colégio|faculdade|universidade|curso|mensalidade|matricula|matrícula)$/.test(singular)) return 'educação'
  if (/^(outros|outro|diversos|miscelanea|miscelânea)$/.test(singular)) return 'outros'
  return ''
}
export function toCanonicalCategoryName(name) {
  const n = normalizeNoAccentsLower(name).replace(/\sgastos?$/, '').trim()
  if (/^(saude|farmacia|drogaria)$/.test(n)) return 'Saúde'
  if (/^(mercado|supermercado|hiper(mercado)?)$/.test(n)) return 'Supermercado'
  if (/^(lazer|entretenimento|cinema|show|teatro|balada)$/.test(n)) return 'Lazer'
  if (/^(educacao|educação|escola|colegio|colégio|faculdade|universidade|curso|mensalidade|matricula|matrícula)$/.test(n)) return 'Educação'
  if (!n) return 'Outros gastos'
  return 'Outros gastos'
}
export function normalizeCatKeyForBudget(name) {
  const n = normalizeNoAccentsLower(name).replace(/\sgastos?$/, '').trim()
  if (/^(saude)$/.test(n)) return 'saude'
  if (/^(mercado|supermercado|hiper(mercado)?)$/.test(n)) return 'mercado'
  if (/^(lazer)$/.test(n)) return 'lazer'
  if (/^(educacao|educação|escola|colegio|colégio|faculdade|universidade|curso|mensalidade|matricula|matrícula)$/.test(n)) return 'educacao'
  return 'outros'
}

// --- Normalização de despesa ---
export function normalizeExpenseData(extracted, existing = {}, bufferText = '') {
  const out = { ...existing }
  const src = { ...(extracted || {}) }

  if (isEmptyValue(src.forma_pagamento)) {
    src.forma_pagamento = src['forma de pagamento'] || src.pagamento || src.meio_pagamento || src['meio de pagamento']
  }
  if (isEmptyValue(src.data)) {
    src.data = src.date || src.data_compra || src['data da compra']
  }
  if (isEmptyValue(src.estabelecimento)) {
    src.estabelecimento = src.local || src.loja
  }

  const valorNovo = parseCurrencyToNumber(src.valor ?? bufferText)
  out.valor = coalesce(valorNovo, existing.valor)

  let dataCandidata = src.data
  if (!dataCandidata) dataCandidata = parseDateFromText(bufferText)
  out.data = coalesce(dataCandidata, existing.data)

  let estabelecimentoCand = src.estabelecimento
  if (isEmptyValue(estabelecimentoCand)) {
    estabelecimentoCand = extractEstabelecimentoFromText(bufferText)
  }
  if (isEmptyValue(estabelecimentoCand)) {
    estabelecimentoCand = matchKnownEstabelecimento(bufferText)
  }
  out.estabelecimento = coalesce(estabelecimentoCand, existing.estabelecimento)

  let categoriaCand = src.categoria
  if (isEmptyValue(categoriaCand)) {
    categoriaCand = inferCategoriaFromEstabelecimento(out.estabelecimento)
    if (!categoriaCand) {
      categoriaCand = inferCategoriaFromText(bufferText)
    }
  }
  out.categoria = coalesce(categoriaCand, existing.categoria)

  let formaPagamentoCand = src.forma_pagamento
  if (isEmptyValue(formaPagamentoCand)) {
    formaPagamentoCand = inferFormaPagamentoFromText(bufferText) || 'pix'
  }
  out.forma_pagamento = coalesce(formaPagamentoCand, existing.forma_pagamento)

  if (!isEmptyValue(bufferText)) {
    out.raw_text = bufferText
  } else {
    out.raw_text = coalesce(src.raw_text, existing.raw_text)
  }

  return out
}

export async function processarDadosDespesa(content, userId, dadosExistentes = {}, obrigatorios = []) {
  const dados = await extractExpense(content, userId)
  const dadosParciais = normalizeExpenseData(dados, dadosExistentes, String(content || ''))
  const pendente = obrigatorios.find(campo => !dadosParciais[campo])
  return { dadosParciais, pendente }
}

export async function processarDadosDespesaComBuffer(bufferText, userId, dadosExistentes = {}, obrigatorios = []) {
  const texto = Array.isArray(bufferText) ? bufferText.join('\n') : String(bufferText || '')
  const dados = await extractExpense(texto, userId)
  const dadosParciais = normalizeExpenseData(dados, dadosExistentes, texto)
  const pendente = obrigatorios.find(campo => !dadosParciais[campo])
  return { dadosParciais, pendente }
}

// --- Detecção e mensagens ---
export function detectaDespesaAutomatica(mensagem) {
  const texto = mensagem.toLowerCase()
  const palavrasGasto = [
    'gastei', 'paguei', 'comprei', 'fui no', 'fui na', 'comi no', 'comi na',
    'tomei no', 'tomei na', 'peguei um', 'peguei uma', 'almocei', 'jantei',
    'café', 'uber', '99', 'taxi', 'gasolina', 'farmácia', 'mercado', 'restaurante'
  ]
  const padraoValor = /(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais?|r\$)?/i
  const temPalavraGasto = palavrasGasto.some(palavra => texto.includes(palavra))
  const temValor = padraoValor.test(texto)
  return temPalavraGasto && temValor
}

// --- Normalização de receita ---
export function normalizeRevenueData(extracted, existing = {}, bufferText = '') {
  const out = { ...existing }
  const src = { ...(extracted || {}) }

  if (isEmptyValue(src.forma_pagamento)) {
    src.forma_pagamento = src['forma de pagamento'] || src.pagamento || src.meio_pagamento || src['meio de pagamento']
  }
  if (isEmptyValue(src.data)) {
    src.data = src.date || src.data_recebimento || src['data do recebimento']
  }
  if (isEmptyValue(src.estabelecimento)) {
    src.estabelecimento = src.fonte || src.origem || src.descricao || src.descr || 'Receita'
  }

  const valorNovo = parseCurrencyToNumber(src.valor ?? bufferText)
  out.valor = Number.isFinite(valorNovo) ? Math.abs(valorNovo) : coalesce(valorNovo, existing.valor)

  let dataCandidata = src.data
  if (!dataCandidata) dataCandidata = parseDateFromText(bufferText)
  out.data = coalesce(dataCandidata, existing.data)

  let estabelecimentoCand = src.estabelecimento
  if (isEmptyValue(estabelecimentoCand)) {
    // tenta extrair um nome simples; se falhar, mantém 'Receita'
    estabelecimentoCand = extractEstabelecimentoFromText(bufferText) || 'Receita'
  }
  out.estabelecimento = coalesce(estabelecimentoCand, existing.estabelecimento)

  // Categoria padrão para receita
  let categoriaCand = src.categoria
  if (isEmptyValue(categoriaCand)) {
    categoriaCand = 'receita'
  }
  out.categoria = coalesce(categoriaCand, existing.categoria)

  let formaPagamentoCand = src.forma_pagamento
  if (isEmptyValue(formaPagamentoCand)) {
    formaPagamentoCand = inferFormaPagamentoFromText(bufferText)
  }
  out.forma_pagamento = coalesce(formaPagamentoCand, existing.forma_pagamento)

  if (!isEmptyValue(bufferText)) {
    out.raw_text = bufferText
  } else {
    out.raw_text = coalesce(src.raw_text, existing.raw_text)
  }

  return out
}

export async function processarDadosReceita(content, userId, dadosExistentes = {}, obrigatorios = []) {
  // Tenta reaproveitar o extrator existente (pode capturar valor/data); depois normaliza como receita
  let dados = {}
  try {
    dados = await extractExpense(content, userId)
  } catch {}
  const dadosParciais = normalizeRevenueData(dados, dadosExistentes, String(content || ''))
  const pendente = obrigatorios.find(campo => !dadosParciais[campo])
  return { dadosParciais, pendente }
}

export async function processarDadosReceitaComBuffer(bufferText, userId, dadosExistentes = {}, obrigatorios = []) {
  const texto = Array.isArray(bufferText) ? bufferText.join('\n') : String(bufferText || '')
  let dados = {}
  try {
    dados = await extractExpense(texto, userId)
  } catch {}
  const dadosParciais = normalizeRevenueData(dados, dadosExistentes, texto)
  const pendente = obrigatorios.find(campo => !dadosParciais[campo])
  return { dadosParciais, pendente }
}
export function isContinuar(msg) { return msg && msg.trim().toLowerCase() === 'continuar' }
export function isNovo(msg) { return msg && msg.trim().toLowerCase() === 'novo' }
export function mensagemCampo(campo) {
  const frases = {
    data: [
      'Só pra gente organizar aqui, em que data foi essa despesa?',
      'Legal! Qual foi o dia desse gasto?',
      'Me diz a data dessa despesa? '
    ],
    estabelecimento: [
      'Em qual estabelecimento ou local foi essa compra?',
      'Show! Agora, onde foi essa despesa?',
      'Pode me falar o nome do lugar onde você gastou?'
    ],
    valor: [
      'E quanto foi gasto? (Só o valor mesmo!)',
      'Qual foi o valor dessa despesa?',
      'Me diz o valor exato, por favor?'
    ],
    categoria: [
      'Em qual categoria encaixa essa despesa? (Mercado, saúde, restaurante, etc)',
      'Como você classificaria esse gasto? (Ex: mercado, saúde, lazer...)',
      'Pra fechar, me diz a categoria dessa compra?'
    ],
    forma_pagamento: [
      'Como foi o pagamento? (Dinheiro, cartão, Pix...)?',
      'Pagou como? (Cartão, Pix, dinheiro...)?',
      'Qual foi a forma de pagamento usada?'
    ],
    raw_text: [
      'Se quiser, descreva a despesa com mais detalhes.',
      'Quer adicionar alguma observação sobre essa compra?',
      'Se tiver mais algum detalhe, só mandar aqui!'
    ]
  }
  const lista = frases[campo] || ['Pode informar esse campo?']
  return lista[Math.floor(Math.random() * lista.length)]
}
export function saudacaoInicial() {
  const sauda = [
    'Olá! Estou pronto para te ajudar.',
    'Oi, tudo bem? Como te ajudo hoje!',
    'Buenaaas! Vc precisa cadastrar um gasto, quer um resumo, saber quais foram os últimos gastos, ou um resumo do mês?'
  ]
  return sauda[Math.floor(Math.random() * sauda.length)]
}
export function extrairMesAno(mensagem) {
  const hoje = new Date()
  const regex = /(\d{1,2})[\/-](\d{4})/
  const match = mensagem.match(regex)
  if (match) {
    const mes = String(match[1]).padStart(2, '0')
    const ano = match[2]
    return `${mes}-${ano}`
  }
  return `${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`
}
export function monthNumberToPtName(mm) {
  const nomes = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const idx = Math.max(1, Math.min(12, parseInt(mm, 10))) - 1
  return nomes[idx]
}
export function buildBudgetsMapFromResumo(resumo, mesAno) {
  if (!resumo) return {}
  const targetMM = String(mesAno).split('-')[0]
  const targetName = monthNumberToPtName(targetMM)
  const candidates = resumo.budgets || resumo.orcamentos || resumo.category_budgets || resumo.budget_by_category || []
  if (!Array.isArray(candidates) || candidates.length === 0) return {}
  const map = {}
  for (const item of candidates) {
    const categoria = item.categoria || item.category || item.nome || item.name
    if (!categoria) continue
    const mesTxt = (item.mes || item.month_name || '').toString().toLowerCase()
    const monthCode = (item.month || item.codigo_mes || '').toString().toLowerCase()
    if (mesTxt && !mesTxt.includes(targetName)) continue
    if (monthCode && monthCode !== String(mesAno).toLowerCase()) continue
    const orc = item.orcamento ?? item.budget ?? item.total ?? item.valor
    const key = normalizeCatKeyForBudget(categoria)
    const num = typeof orc === 'number' ? orc : Number(String(orc || '0').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    map[key] = Number.isFinite(num) ? num : 0
  }
  return map
}


