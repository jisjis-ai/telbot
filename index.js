const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

// Bot configuration
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY';
const CHANNEL_ID = -1002003497082;
const START_HOUR = 8;
const END_HOUR = 19;
const ADMIN_USERNAME = '007';
const ADMIN_PASSWORD = '006007';
const AFFILIATE_URL = 'https://media1.placard.co.mz/redirect.aspx?pid=2197&bid=1690';
const TIMEZONE = 'Africa/Maputo';

// Console styling
const consoleStyle = {
  system: '\x1b[38;5;39m',  // Bright blue
  error: '\x1b[38;5;196m',  // Bright red
  success: '\x1b[38;5;82m', // Bright green
  warning: '\x1b[38;5;214m', // Bright orange
  info: '\x1b[38;5;147m',   // Light purple
  reset: '\x1b[0m'
};

// Enhanced ASCII Art
const ASCII_LOGO = `
${consoleStyle.system}╔══════════════════════════════════════════════════════╗
║             🤖 QUANTUM SIGNALS BOT v2.0              ║
║        [ SISTEMA QUANTUM INICIADO COM SUCESSO ]      ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_ERROR = `
${consoleStyle.error}╔══════════════════════════════════════════════════════╗
║           ⚠️  ALERTA DO SISTEMA QUANTUM             ║
║              [ FALHA DETECTADA ]                    ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_MESSAGE = `
${consoleStyle.info}╔══════════════════════════════════════════════════════╗
║           📨 NOVA MENSAGEM DETECTADA                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_COMMAND = `
${consoleStyle.system}╔══════════════════════════════════════════════════════╗
║           ⌨️  COMANDO ADMINISTRATIVO                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_OPERATION = `
${consoleStyle.success}╔══════════════════════════════════════════════════════╗
║           🎯 NOVA OPERAÇÃO INICIADA                 ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

// Console logging functions
const logSystem = (message) => console.log(`${consoleStyle.system}[SISTEMA] ➤ ${message}${consoleStyle.reset}`);
const logError = (message) => console.log(`${consoleStyle.error}[ERRO] ➤ ${message}${consoleStyle.reset}`);
const logSuccess = (message) => console.log(`${consoleStyle.success}[SUCESSO] ➤ ${message}${consoleStyle.reset}`);
const logWarning = (message) => console.log(`${consoleStyle.warning}[AVISO] ➤ ${message}${consoleStyle.reset}`);
const logInfo = (message) => console.log(`${consoleStyle.info}[INFO] ➤ ${message}${consoleStyle.reset}`);

class OperationsBot {
  constructor(token, channelId) {
    console.log(ASCII_LOGO);
    logSystem('Iniciando sistemas...');
    logSystem('Carregando módulos...');
    logSystem('Estabelecendo conexão com Telegram API...');
    
    this.bot = new TelegramBot(token, { polling: true });
    this.channelId = channelId;
    this.isOperating = false;
    this.stats = {
      totalOperations: 0,
      greenOperations: 0,
      messagesSent: 0,
      dailyOperations: 0
    };
    this.adminSessions = new Map();
    this.startTime = Date.now();
    this.operationTimeout = null;
    this.forceOperating = false;
    this.customStartHour = START_HOUR;
    this.customEndHour = END_HOUR;

    moment.tz.setDefault(TIMEZONE);
    
    logSuccess('Conexão estabelecida com sucesso!');
    logSystem('Configurando manipuladores de eventos...');

    this.setupErrorHandlers();
    this.setupCommands();
    this.setupSchedules();
    this.setupCallbackQueries();

    logSuccess('Sistema Quantum totalmente operacional!');
  }

  reconnect() {
    logWarning('Tentando reconectar ao servidor...');
    setTimeout(() => {
      try {
        this.bot.stopPolling();
        setTimeout(() => {
          this.bot.startPolling();
          logSuccess('Reconexão estabelecida com sucesso!');
        }, 1000);
      } catch (error) {
        logError(`Falha na reconexão: ${error}`);
        this.reconnect();
      }
    }, 5000);
  }

  setupErrorHandlers() {
    this.bot.on('error', (error) => {
      console.log(ASCII_ERROR);
      logError(`Erro detectado: ${error}`);
      this.reconnect();
    });

    this.bot.on('polling_error', (error) => {
      if (error.code !== 'EFATAL') {
        console.log(ASCII_ERROR);
        logWarning(`Erro de polling: ${error}`);
        this.reconnect();
      }
    });

    process.on('uncaughtException', (error) => {
      console.log(ASCII_ERROR);
      logError(`Erro não tratado: ${error}`);
      this.reconnect();
    });
  }

  setupCommands() {
    this.bot.on('message', async (msg) => {
      try {
        console.log(ASCII_MESSAGE);
        logInfo(`Mensagem recebida de ${msg.from.id}: ${msg.text}`);
        await this.handleMessage(msg);
      } catch (error) {
        logError(`Erro ao processar mensagem: ${error}`);
      }
    });

    this.sendMessageWithRetry(this.channelId, '🤖 Bot iniciado com sucesso!')
      .then(() => logSuccess('Mensagem de teste enviada com sucesso'))
      .catch(error => logError(`Erro ao enviar mensagem de teste: ${error}`));
  }

  setupCallbackQueries() {
    this.bot.on('callback_query', async (query) => {
      console.log(ASCII_COMMAND);
      logInfo(`Callback recebido: ${query.data}`);
      
      try {
        const chatId = query.message.chat.id;
        const session = this.adminSessions.get(chatId);

        if (!session || session.step !== 'authenticated') {
          await this.bot.answerCallbackQuery(query.id, { text: '⚠️ Acesso negado!' });
          logWarning(`Tentativa de acesso não autorizado de ${chatId}`);
          return;
        }

        switch (query.data) {
          case 'start_ops':
            this.isOperating = true;
            await this.sendMessageWithRetry(chatId, '▶️ Operações iniciadas manualmente.');
            logSuccess('Operações iniciadas manualmente');
            this.scheduleNextOperation();
            break;

          case 'stop_ops':
            this.isOperating = false;
            if (this.operationTimeout) {
              clearTimeout(this.operationTimeout);
              this.operationTimeout = null;
            }
            await this.sendMessageWithRetry(chatId, '🛑 Operações pausadas manualmente.');
            logWarning('Operações pausadas manualmente');
            break;

          case 'force_start':
            this.forceOperating = true;
            this.isOperating = true;
            await this.sendMessageWithRetry(chatId, '⚡️ Modo força ativado - Operações iniciadas fora do horário.');
            logWarning('Modo força ativado');
            this.scheduleNextOperation();
            break;

          case 'force_stop':
            this.forceOperating = false;
            this.isOperating = false;
            if (this.operationTimeout) {
              clearTimeout(this.operationTimeout);
              this.operationTimeout = null;
            }
            await this.sendMessageWithRetry(chatId, '🔒 Modo força desativado - Operações normalizadas.');
            logSuccess('Modo força desativado');
            break;
        }

        await this.bot.answerCallbackQuery(query.id);
      } catch (error) {
        logError(`Erro ao processar callback: ${error}`);
      }
    });
  }

  setupSchedules() {
    logSystem('Configurando agendamentos...');
    
    schedule.scheduleJob('0 0 * * *', () => {
      this.stats.dailyOperations = 0;
      logInfo('Contador de operações diárias resetado');
    });

    schedule.scheduleJob('0 7 * * *', () => {
      logInfo('Enviando mensagem pré-operações');
      this.sendPreOperationsMessage();
    });

    schedule.scheduleJob(`0 ${this.customStartHour} * * *`, () => {
      logInfo('Iniciando operações programadas');
      this.startOperations();
    });

    schedule.scheduleJob(`0 ${this.customEndHour} * * *`, () => {
      logInfo('Encerrando operações programadas');
      this.endOperations();
    });

    logSuccess('Agendamentos configurados com sucesso');
  }

  async sendMessageWithRetry(chatId, message, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.bot.sendMessage(chatId, message, options);
        logInfo(`Mensagem enviada para ${chatId}`);
        return result;
      } catch (error) {
        logError(`Tentativa ${i + 1} de envio falhou: ${error}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async handleMessage(msg) {
    if (!msg.chat || msg.chat.type !== 'private') return;
    
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const session = this.adminSessions.get(chatId) || { step: 'start' };

    try {
      if (text.startsWith('/')) {
        console.log(ASCII_COMMAND);
        logInfo(`Comando recebido: ${text}`);
        await this.handleAdminCommand(chatId, text);
        return;
      }

      switch (session.step) {
        case 'start':
          await this.sendMessageWithRetry(chatId, 'Olá, bem-vindo ao painel admin!\nDigite seu username:');
          session.step = 'username';
          break;

        case 'username':
          if (text === ADMIN_USERNAME) {
            await this.sendMessageWithRetry(chatId, 'Digite sua senha:');
            session.step = 'password';
            logInfo(`Tentativa de login: username correto de ${chatId}`);
          } else {
            await this.sendMessageWithRetry(chatId, 'Username incorreto. Tente novamente.\nDigite seu username:');
            logWarning(`Tentativa de login: username incorreto de ${chatId}`);
          }
          break;

        case 'password':
          if (text === ADMIN_PASSWORD) {
            session.step = 'authenticated';
            await this.sendAdminMenu(chatId);
            logSuccess(`Login bem-sucedido: ${chatId}`);
          } else {
            await this.sendMessageWithRetry(chatId, 'Senha incorreta. Acesso negado.');
            logWarning(`Tentativa de login: senha incorreta de ${chatId}`);
            session.step = 'start';
          }
          break;

        // ... rest of the cases remain the same
    
  }

  async sendOperation() {
    if (!this.isOperating) return;

    try {
      console.log(ASCII_OPERATION);
      const multiplier = (Math.random() * (6.99 - 1.00) + 1.00).toFixed(2);
      const keyboard = {
        inline_keyboard: [
          [{ text: '🎯 Apostar Agora', url: AFFILIATE_URL }],
          [{ text: '📝 Criar Conta', url: AFFILIATE_URL }]
        ]
      };

      const nextOperationTime = moment().add(3, 'minutes').format('HH:mm');

      logInfo(`Enviando operação com multiplicador ${multiplier}x`);
      await this.sendMessageWithRetry(
        this.channelId,
        `🎯 *NOVA OPORTUNIDADE!*\n\n` +
        `⚡️ Multiplicador: ${multiplier}x\n` +
        `⏰ Entrada: ${nextOperationTime}\n\n` +
        `⚠️ Saia antes do crash!\n` +
        `✅ Faça sua entrada agora!`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );
      
      this.stats.messagesSent++;
      this.stats.totalOperations++;
      this.stats.dailyOperations++;
      logSuccess(`Operação #${this.stats.totalOperations} enviada com sucesso`);

      setTimeout(() => this.sendResult(), 3 * 60 * 1000);
    } catch (error) {
      logError(`Erro ao enviar operação: ${error}`);
      this.scheduleNextOperation();
    }
  }

  // ... rest of the methods remain the same
}

try {
  logSystem('Iniciando sistema Quantum...');
  const bot = new OperationsBot(TOKEN, CHANNEL_ID);
  logSuccess('Sistema Quantum online e operacional!');

  process.on('SIGINT', () => {
    logWarning('Encerrando sistema Quantum...');
    if (bot.operationTimeout) {
      clearTimeout(bot.operationTimeout);
    }
    bot.isOperating = false;
    process.exit(0);
  });
} catch (error) {
  logError(`Falha crítica ao iniciar: ${error}`);
  process.exit(1);
}
