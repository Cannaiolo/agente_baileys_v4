export default class DataNormalizer {
  static normalizeNoAccentsLower(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  static parseCurrencyToNumber(input) {
    if (typeof input === 'number') return input
    const str = String(input || '')
    const match = str.match(/\d+[\.,]?\d*/)
    if (!match) return null
    const numeric = match[0].replace(/\./g, '').replace(',', '.')
    const num = Number(numeric)
    return Number.isFinite(num) ? num : null
  }

  static parseDateFromText(texto) {
    const lower = (texto || '').toLowerCase()
    if (lower.includes('hoje')) return this.formatDateDDMMYYYY(new Date())
    if (lower.includes('ontem')) {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return this.formatDateDDMMYYYY(d)
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

  static formatDateDDMMYYYY(dateObj) {
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return ''
    const d = String(dateObj.getDate()).padStart(2, '0')
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const y = dateObj.getFullYear()
    return `${d}/${m}/${y}`
  }

  static formatAnyDateToDDMMYYYY(input, separator = '-') {
    const sep = typeof separator === 'string' && separator.length > 0 ? separator : '-'
    let dateObj = null
    
    if (input instanceof Date) {
      dateObj = input
    } else if (typeof input === 'string') {
      const s = input.trim()
      // dd/mm/yyyy
      const m1 = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/)
      if (m1) {
        const d = Number(m[1])
        const m = Number(m[2])
        const y = Number(m[3])
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

  static formatCurrencyBRL(value) {
    const num = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.'))
    if (!Number.isFinite(num)) return 'R$ 0,00'
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  static extrairMesAno(mensagem) {
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
}
