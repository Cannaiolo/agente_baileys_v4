import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import classifyMessage from '../agents/classifyMessage.js'
import FlowManager from '../flows/FlowManager.js'
import MessageHandlers from '../handlers/MessageHandlers.js'
import { getSession, clearSession } from '../infra/sessionMemory.js'
import { saudacaoInicial } from './helpers.js'

export default class WhatsAppBot {
  constructor() {
    this.sock = null
    this.flowManager = null
    this.messageHandlers = null
  }

  async start() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi')
    const { version } = await fetchLatestBaileysVersion()
    this.sock = makeWASocket({ version, auth: state })

    this.setupEventHandlers(saveCreds)
    this.setupMessageHandler()
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on('connection.update', (update) => {
      const { qr, connection, lastDisconnect } = update
      
      if (qr) {
        console.clear()
        console.log('\n📱  Escaneie o QR code abaixo com o WhatsApp para conectar:\n')
        qrcode.generate(qr, { small: true })
      }
      
      if (connection === 'open') {
        console.log('✅  Conectado ao WhatsApp!')
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = code !== DisconnectReason.loggedOut
        console.log(`❌  Conexão encerrada (código ${code}). Reconnect: ${shouldReconnect}`)
        if (shouldReconnect) setTimeout(() => this.start(), 1000)
      }
    })

    this.sock.ev.on('creds.update', saveCreds)
  }

  setupMessageHandler() {
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      if (!messages || messages.length === 0) return

      const msg = messages[0]
      if (!msg.message || msg.key.fromMe) return

      const from = msg.key.remoteJid
      const userId = from
      const content = this.extractMessageContent(msg.message)

      if (!content) return

      console.log('📨 Mensagem recebida:', content)
      await this.processMessage(content, userId, from)
    })
  }

  extractMessageContent(message) {
    if (message.conversation) return message.conversation
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
    return null
  }

  async processMessage(content, userId, from) {
    // Inicializar managers
    this.flowManager = new FlowManager(this.sock, userId, from)
    this.messageHandlers = new MessageHandlers(this.sock, from, userId)

    // Tentar processar com fluxo automático primeiro
    const flowResult = await this.flowManager.processMessage(content)
    if (flowResult) {
      if (flowResult === 'completed') return
      if (flowResult === 'outro') {
        await this.messageHandlers.sendMessage(saudacaoInicial())
        return
      }
      return // Fluxo em andamento
    }

    // Se não foi processado automaticamente, classificar e rotear
    const label = await classifyMessage(content)
    console.log('[classifyMessage] Label escolhida:', label)

    await this.routeMessage(label, content, userId, from)
  }

  async routeMessage(label, content, userId, from) {
    const session = getSession(userId)

    // Roteamento para fluxos de entrada de dados
    if (label === 'registrar_despesa' || label === 'registrar_receita') {
      const flowType = label === 'registrar_despesa' ? 'expense' : 'revenue'
      await this.flowManager.startManualFlow(label, content)
      return
    }

    // Roteamento para handlers de consulta
    const handlerMap = {
      'resumo_gastos': () => this.messageHandlers.handleResumoGastos(content),
      'lista_ultimos_gastos': () => this.messageHandlers.handleUltimosGastos(content),
      'setar_orcamento_categoria_mes': () => this.messageHandlers.handleOrcamento(content),
      'pergunta_saldo': () => this.messageHandlers.handleSaldo(content)
    }

    if (handlerMap[label]) {
      await handlerMap[label]()
      return
    }

    // Tratamento do label 'outro' com contexto
    if (label === 'outro') {
      const mensagem = session?.etapa === 'registrando_gasto' 
        ? 'Você estava registrando um gasto. Deseja continuar ou começar algo novo? Responda "continuar" ou "novo".'
        : saudacaoInicial()
      await this.messageHandlers.sendMessage(mensagem)
      return
    }

    // Fallback
    await this.messageHandlers.sendMessage(saudacaoInicial())
  }
}

export async function startSock() {
  const bot = new WhatsAppBot()
  await bot.start()
}
