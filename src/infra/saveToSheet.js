import fetch from 'node-fetch'

export async function saveToSheet(dados, userId) {
  const sheetApiUrl = process.env.SHEET_API_URL || 'https://agentefinanceiro.emilianobmachado.workers.dev/'

  // monta o corpo da requisição
  const payload = {
    operation: 'upsert_expense',
    userId,
    ...dados
  }

  const obrigatorios = ['data', 'estabelecimento', 'valor', 'categoria', 'forma_pagamento'];
  for (const campo of obrigatorios) {
    if (!dados[campo]) {
      console.error(`Campo obrigatório ausente: ${campo}`);
      return false;
    }
  }

  try {
    const response = await fetch(sheetApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // signal: controller.signal // se usar AbortController para timeout
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'OK') {
      console.error('❌ Falha ao salvar na planilha:', { payload, result });
      return false;
    }

    console.log('✅ Gasto salvo com sucesso:', result);
    return true;
  } catch (error) {
    console.error('❌ Erro na requisição para o Worker:', { error, payload });
    return false;
  }
}
