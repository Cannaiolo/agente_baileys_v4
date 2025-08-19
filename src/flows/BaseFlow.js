export default class BaseFlow {
  constructor(sock, userId, from) {
    this.sock = sock
    this.userId = userId
    this.from = from
    this.session = null
  }

  async initialize() {
    this.session = this.getSession()
    return this
  }

  getSession() {
    // Implementado pelas classes filhas
    throw new Error('getSession deve ser implementado')
  }

  setSession(data) {
    // Implementado pelas classes filhas
    throw new Error('setSession deve ser implementado')
  }

  clearSession() {
    // Implementado pelas classes filhas
    throw new Error('clearSession deve ser implementado')
  }

  async sendMessage(text) {
    return await this.sock.sendMessage(this.from, { text })
  }

  async processMessage(content) {
    throw new Error('processMessage deve ser implementado')
  }

  shouldContinue() {
    return this.session?.etapa === this.constructor.name.toLowerCase()
  }

  getNextPendingField() {
    throw new Error('getNextPendingField deve ser implementado')
  }

  async handlePivot(newLabel) {
    this.clearSession()
    return newLabel
  }
}
