import BaseFlow from './BaseFlow.js'
import { processarDadosReceita, processarDadosReceitaComBuffer } from '../whatsapp/helpers.js'
import { saveToSheet } from '../infra/saveToSheet.js'
import { setSession, getSession, clearSession } from '../infra/sessionMemory.js'
import { mensagemCampo, isContinuar, isNovo } from '../whatsapp/helpers.js'

export default class RevenueFlow extends BaseFlow {
  constructor(sock, userId, from) {
    super(sock, userId, from)
    this.requiredFields = ['data', 'estabelecimento', 'valor', 'categoria']
    this.flowType = 'registrando_receita'
  }

  getSession() {
    return getSession(this.userId)
  }

  setSession(data) {
    setSession(this.userId, data)
  }

  clearSession() {
    clearSession(this.userId)
  }

  getNextPendingField() {
    return this.requiredFields.find(field => !this.session?.dadosParciais?.[field])
  }

  async processMessage(content) {
    // Verificar comandos especiais
    if (isNovo(content)) {
      this.clearSession()
      await this.sendMessage('Ok, contexto limpo! O que deseja fazer agora?')
      return 'outro'
    }

    if (isContinuar(content)) {
      const pending = this.getNextPendingField()
      if (pending) {
        await this.sendMessage(mensagemCampo(pending))
      } else {
        await this.sendMessage('Vamos continuar. Qual o próximo passo?')
      }
      return this.flowType
    }

    // Processar dados da mensagem
    const bufferAtual = [...(this.session?.bufferText || []), content]
    const { dadosParciais, pendente } = await this.extractData(bufferAtual)
    
    // Verificar se dados estão completos
    if (!pendente) {
      await this.completeRevenue(dadosParciais)
      return 'completed'
    }

    // Continuar coletando dados
    await this.continueCollection(dadosParciais, bufferAtual, pendente)
    return this.flowType
  }

  async extractData(bufferText) {
    // Usar JIT_RECLUSTERIZE se configurado
    const useBuffer = process.env.JIT_RECLUSTERIZE !== '0'
    
    if (useBuffer) {
      return await processarDadosReceitaComBuffer(bufferText, this.userId, this.session?.dadosParciais, this.requiredFields)
    } else {
      return await processarDadosReceita(content, this.userId, this.session?.dadosParciais, this.requiredFields)
    }
  }

  async completeRevenue(dadosParciais) {
    // Adicionar forma_pagamento padrão para receitas
    const payload = { ...dadosParciais, forma_pagamento: 'pix' }
    const success = await saveToSheet(payload, this.userId)
    
    if (success) {
      await this.sendMessage('💰 Recebido com sucesso')
      this.clearSession()
    } else {
      await this.sendMessage('❌ Ocorreu um erro ao salvar a receita. Tente novamente.')
    }
  }

  async continueCollection(dadosParciais, bufferText, pendingField) {
    // Garantir que forma_pagamento seja sempre 'pix' para receitas
    const dadosCompletos = { ...dadosParciais, forma_pagamento: 'pix' }
    
    this.setSession({
      etapa: this.flowType,
      dadosParciais: dadosCompletos,
      bufferText,
      advisoryHistory: this.session?.advisoryHistory || [],
      ultimoCampoPerguntado: pendingField
    })
    
    await this.sendMessage(mensagemCampo(pendingField))
  }

  async startNewFlow(content) {
    const bufferInicial = [content]
    const { dadosParciais, pendente } = await this.extractData(bufferInicial)
    
    if (!pendente) {
      await this.completeRevenue(dadosParciais)
      return 'completed'
    }

    this.setSession({
      etapa: this.flowType,
      dadosParciais: { ...dadosParciais, forma_pagamento: 'pix' },
      bufferText: bufferInicial,
      advisoryHistory: [],
      ultimoCampoPerguntado: pendente
    })

    await this.sendMessage(mensagemCampo(pendente))
    return this.flowType
  }
}
