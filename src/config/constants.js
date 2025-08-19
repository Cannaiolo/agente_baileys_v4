export const FLOW_TYPES = {
  EXPENSE: 'registrando_gasto',
  REVENUE: 'registrando_receita'
}

export const REQUIRED_FIELDS = {
  EXPENSE: ['data', 'estabelecimento', 'valor', 'categoria', 'forma_pagamento'],
  REVENUE: ['data', 'estabelecimento', 'valor', 'categoria']
}

export const MESSAGE_LABELS = {
  REGISTER_EXPENSE: 'registrar_despesa',
  REGISTER_REVENUE: 'registrar_receita',
  EXPENSE_SUMMARY: 'resumo_gastos',
  LAST_EXPENSES: 'lista_ultimos_gastos',
  SET_BUDGET: 'setar_orcamento_categoria_mes',
  CHECK_BALANCE: 'pergunta_saldo',
  OTHER: 'outro'
}

export const SUCCESS_MESSAGES = {
  EXPENSE: '✅ Pronto! Despesa registrada com sucesso!',
  EXPENSE_AUTO: '✅ Pronto! Despesa registrada automaticamente!',
  REVENUE: '💰 Dinheiro recebido com sucesso!',
  ERROR: '❌ Não consegui salvar. Tente novamente.'
}

export const COMMAND_KEYWORDS = {
  CONTINUE: 'continuar',
  NEW: 'novo',
  CANCEL: 'cancelar'
}

export const PIVOT_KEYWORDS = (process.env.PIVOT_KEYWORDS || 'resumo,cancelar,novo')
  .split(',')
  .map((t) => t.trim().toLowerCase())

export const CONFIG = {
  ALWAYS_CLASSIFY: process.env.ALWAYS_CLASSIFY !== '0',
  JIT_RECLUSTERIZE: process.env.JIT_RECLUSTERIZE !== '0',
  INTENT_STICKINESS: parseInt(process.env.INTENT_STICKINESS || '2', 10)
}
