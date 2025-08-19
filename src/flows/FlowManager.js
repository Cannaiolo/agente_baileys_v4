import ExpenseFlow from './ExpenseFlow.js'
import RevenueFlow from './RevenueFlow.js'
import AutoDetector from '../detectors/AutoDetector.js'
import { getSession } from '../infra/sessionMemory.js'

export default class FlowManager {
  constructor(sock, userId, from) {
    this.sock = sock
    this.userId = userId
    this.from = from
    this.flows = {
      expense: new ExpenseFlow(sock, userId, from),
      revenue: new RevenueFlow(sock, userId, from)
    }
  }

  async processMessage(content) {
    const session = getSession(this.userId)
    
    // Se já existe uma sessão ativa, continuar o fluxo
    if (session?.etapa) {
      return await this.continueExistingFlow(session, content)
    }

    // Detectar automaticamente o tipo de mensagem
    const detectionType = AutoDetector.getDetectionType(content)
    if (detectionType) {
      return await this.startAutoDetectedFlow(detectionType, content)
    }

    // Se não foi detectado automaticamente, retornar null para classificação normal
    return null
  }

  async continueExistingFlow(session, content) {
    const flowType = session.etapa
    
    if (flowType === 'registrando_gasto') {
      await this.flows.expense.initialize()
      return await this.flows.expense.processMessage(content)
    }
    
    if (flowType === 'registrando_receita') {
      await this.flows.revenue.initialize()
      return await this.flows.revenue.processMessage(content)
    }
    
    return null
  }

  async startAutoDetectedFlow(detectionType, content) {
    if (detectionType === 'expense') {
      await this.flows.expense.initialize()
      return await this.flows.expense.startNewFlow(content)
    }
    
    if (detectionType === 'revenue') {
      await this.flows.revenue.initialize()
      return await this.flows.revenue.startNewFlow(content)
    }
    
    return null
  }

  async startManualFlow(flowType, content) {
    if (flowType === 'registrar_despesa') {
      await this.flows.expense.initialize()
      return await this.flows.expense.startNewFlow(content)
    }
    
    if (flowType === 'registrar_receita') {
      await this.flows.revenue.initialize()
      return await this.flows.revenue.startNewFlow(content)
    }
    
    return null
  }
}
