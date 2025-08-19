export default class AutoDetector {
  static detectExpense(content) {
    if (!content) return false
    
    const texto = content.toLowerCase()
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

  static detectRevenue(content) {
    if (!content) return false
    
    const texto = content.toLowerCase()
    const palavrasReceita = [
      'recebi', 'ganhei', 'caiu', 'entrou', 'salario', 'salário', 
      'pix recebido', 'transferência recebida', 'transferencia recebida'
    ]
    
    const padraoValor = /(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais?|r\$)?/i
    const temPalavraReceita = palavrasReceita.some(palavra => texto.includes(palavra))
    const temValor = padraoValor.test(texto)
    
    return temPalavraReceita && temValor
  }

  static getDetectionType(content) {
    if (this.detectExpense(content)) return 'expense'
    if (this.detectRevenue(content)) return 'revenue'
    return null
  }
}
