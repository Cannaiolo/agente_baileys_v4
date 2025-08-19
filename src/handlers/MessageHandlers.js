import fetchResumo from '../agents/fetchResumo.js'
import fetchBudgets from '../agents/fetchBudgets.js'
import generateSummary from '../agents/generateSummary.js'
import fetchUltimosGastos from '../agents/fetchUltimosGastos.js'
import fetchSaldoMensal from '../agents/fetchSaldo.js'
import { clearSession } from '../infra/sessionMemory.js'
import { extrairMesAno, formatAnyDateToDDMMYYYY, formatCurrencyBRL } from '../whatsapp/helpers.js'

export default class MessageHandlers {
  constructor(sock, from, userId) {
    this.sock = sock
    this.from = from
    this.userId = userId
  }

  async sendMessage(text) {
    return await this.sock.sendMessage(this.from, { text })
  }

  async handleResumoGastos(content) {
    clearSession(this.userId)
    const mes = extrairMesAno(content)
    const resumo = await fetchResumo(this.userId, mes)
    
    if (!resumo) {
      await this.sendMessage('😕 Não consegui encontrar seu resumo financeiro nesse período. Tente novamente.')
      return
    }

    const sourceList = Array.isArray(resumo?.by_category) ? resumo.by_category : (resumo?.data || [])
    const hasBudgetInPayload = sourceList.some(c => typeof c?.orcamento === 'number' && !Number.isNaN(c.orcamento))

    let byCat
    if (hasBudgetInPayload) {
      byCat = this.processBudgetData(sourceList)
    } else {
      byCat = await this.fetchAndProcessBudgets(sourceList, mes)
    }

    const resumoComBudget = { ...resumo, by_category: byCat }
    const resposta = await generateSummary(content, resumoComBudget)
    await this.sendMessage(resposta)
  }

  processBudgetData(sourceList) {
    return sourceList.map(c => {
      const rawName = c.categoria || c.category || ''
      const budget = Number(c.orcamento || 0)
      const total = Number(c.total || 0)
      const percentual = c.percentual_usado != null
        ? Number(c.percentual_usado)
        : (budget > 0 ? Math.round((total / budget) * 100) : 0)
      return { ...c, categoria: this.toCanonicalCategoryName(rawName), orcamento: budget, percentual_usado: percentual }
    })
  }

  async fetchAndProcessBudgets(sourceList, mes) {
    const budgetsMap = await fetchBudgets(this.userId, mes)
    return sourceList.map((c) => {
      const rawName = c.categoria || c.category || ''
      const catKey = this.normalizeCatKeyForBudget(rawName)
      const budget = budgetsMap[catKey] ?? 0
      const total = Number(c.total || 0)
      const percentual = budget > 0 ? Math.round((total / budget) * 100) : 0
      return { ...c, categoria: this.toCanonicalCategoryName(rawName), orcamento: budget, percentual_usado: percentual }
    })
  }

  async handleUltimosGastos(content) {
    clearSession(this.userId)
    const limit = 5
    const gastos = await fetchUltimosGastos(this.userId, limit)

    if (!gastos || gastos.length === 0) {
      await this.sendMessage('😕 Não encontrei gastos recentes.')
      return
    }

    const linhas = gastos.slice(0, limit).map((g, idx) => {
      const data = formatAnyDateToDDMMYYYY(g.data || g.date || '-')
      const estab = g.estabelecimento || g.local || g.loja || '-'
      const valor = formatCurrencyBRL(g.valor)
      const categoria = g.categoria ? ` (${g.categoria})` : ''
      return `${idx + 1}. ${data} — ${estab}: ${valor}${categoria}`
    })

    const cabecalho = '📋 Aqui estão seus últimos gastos:\n\n'
    const corpo = linhas.join('\n')
    const rodape = '\n\nSe quiser detalhes de algum, é só me falar!'
    await this.sendMessage(cabecalho + corpo + rodape)
  }

  async handleOrcamento(content) {
    clearSession(this.userId)
    await this.sendMessage('💰 Configuração de orçamento por categoria:\n\n[Funcionalidade em desenvolvimento - será implementada em breve]')
  }

  async handleSaldo(content) {
    clearSession(this.userId)
    const mes = extrairMesAno(content)
    const saldo = await fetchSaldoMensal(this.userId, mes)
    
    if (!saldo) {
      await this.sendMessage('😕 Não consegui calcular seu saldo neste período. Tente novamente.')
      return
    }

    const receitas = saldo.receitas || 0
    const despesas = saldo.despesas || 0
    const saldoFinal = receitas - despesas
    
    const resposta = ` **Saldo do mês (${mes}):**\n\n` +
      `📈 Receitas: R$ ${receitas.toFixed(2)}\n` +
      ` Despesas: R$ ${despesas.toFixed(2)}\n` +
      `💵 **Saldo: R$ ${saldoFinal.toFixed(2)}**`
    
    await this.sendMessage(resposta)
  }

  // Helpers para normalização de categorias
  toCanonicalCategoryName(name) {
    const n = this.normalizeNoAccentsLower(name).replace(/\sgastos?$/, '').trim()
    if (/^(saude|farmacia|drogaria)$/.test(n)) return 'Saúde'
    if (/^(mercado|supermercado|hiper(mercado)?)$/.test(n)) return 'Supermercado'
    if (/^(lazer|entretenimento|cinema|show|teatro|balada)$/.test(n)) return 'Lazer'
    if (/^(educacao|educação|escola|colegio|colégio|faculdade|universidade|curso|mensalidade|matricula|matrícula)$/.test(n)) return 'Educação'
    if (!n) return 'Outros gastos'
    return 'Outros gastos'
  }

  normalizeCatKeyForBudget(name) {
    const n = this.normalizeNoAccentsLower(name).replace(/\sgastos?$/, '').trim()
    if (/^(saude)$/.test(n)) return 'saude'
    if (/^(mercado|supermercado|hiper(mercado)?)$/.test(n)) return 'mercado'
    if (/^(lazer)$/.test(n)) return 'lazer'
    if (/^(educacao|educação|escola|colegio|colégio|faculdade|universidade|curso|mensalidade|matricula|matrícula)$/.test(n)) return 'educacao'
    return 'outros'
  }

  normalizeNoAccentsLower(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }
}
