import dotenv from 'dotenv'
import { startSock } from './src/whatsapp/startSock.js'

dotenv.config()
startSock()
