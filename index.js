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
const TIMEZONE = 'Africa/Maputo'; // Mozambique timezone

class OperationsBot {
  constructor(token, channelId) {
    this.bot = new TelegramBot(token, {
      polling: true
    });
    
    this.channelId = channelId;
    this.isOperating = false;
    this.stats = {
      totalOperations: 0,
      greenOperations: 0,
      messagesSent: 0
    };
    this.adminSessions = new Map();
    this.startTime = Date.now();
    this.operationTimeout = null;
    this.forceOperating = false; // New flag for forced operations
    
    console.log('Bot initialized, setting up commands...');
    this.setupCommands();
    this.setupSchedules();
  }

  getMozambiqueTime() {
    return moment().tz(TIMEZONE);
  }

  getTimeUntilOpen() {
    const now = this.getMozambiqueTime();
    const opening = moment().tz(TIMEZONE).hour(START_HOUR).minute(0).second(0);
    if (now.isAfter(opening)) opening.add(1, 'day');
    return moment.duration(opening.diff(now));
  }

  getTimeUntilClose() {
    const now = this.getMozambiqueTime();
    const closing = moment().tz(TIMEZONE).hour(END_HOUR).minute(0).second(0);
    return moment.duration(closing.diff(now));
  }

  async handleAdminCommand(chatId, text) {
    if (!text) return;

    const command = text.split(' ')[0].toLowerCase();
    const session = this.adminSessions.get(chatId);

    if (!session || session.step !== 'authenticated') {
      await this.sendMessageWithRetry(chatId, '⚠️ Você precisa estar autenticado para usar comandos.');
      return;
    }

    try {
      switch (command) {
        // ... (previous commands remain the same)

        case '/force_open':
          this.forceOperating = true;
          this.isOperating = true;
          await this.sendMessageWithRetry(chatId, '🚨 Operações forçadas abertas!');
          this.scheduleNextOperation();
          break;

        case '/force_close':
          this.forceOperating = false;
          this.isOperating = false;
          if (this.operationTimeout) {
            clearTimeout(this.operationTimeout);
            this.operationTimeout = null;
          }
          await this.sendMessageWithRetry(chatId, '🚨 Operações forçadas fechadas!');
          break;

        case '/time_until_open':
          const timeUntilOpen = this.getTimeUntilOpen();
          await this.sendMessageWithRetry(
            chatId,
            `⏰ Tempo até abrir:\n${timeUntilOpen.hours()}h ${timeUntilOpen.minutes()}m`
          );
          break;

        case '/time_until_close':
          const timeUntilClose = this.getTimeUntilClose();
          await this.sendMessageWithRetry(
            chatId,
            `⏰ Tempo até fechar:\n${timeUntilClose.hours()}h ${timeUntilClose.minutes()}m`
          );
          break;

        case '/operations':
          const keyboard = {
            inline_keyboard: [
              [
                { text: '🟢 Abrir Operações', callback_data: 'open_ops' },
                { text: '🔴 Fechar Operações', callback_data: 'close_ops' }
              ]
            ]
          };
          await this.sendMessageWithRetry(
            chatId,
            '⚙️ Controle de Operações',
            { reply_markup: keyboard }
          );
          break;

        // ... (rest of the commands)
      }
    } catch (error) {
      console.error('Error handling admin command:', error);
      await this.sendMessageWithRetry(chatId, '❌ Erro ao executar o comando. Tente novamente.');
    }
  }

  async sendStatus(chatId) {
    const mozambiqueTime = this.getMozambiqueTime().format('HH:mm');
    const status = `
🤖 *Status do Bot*

🕒 Hora em Moçambique: ${mozambiqueTime}
🔄 Operando: ${this.isOperating ? 'Sim' : 'Não'}
🚨 Modo Forçado: ${this.forceOperating ? 'Sim' : 'Não'}
⏰ Horário Normal: ${START_HOUR}h às ${END_HOUR}h
📊 Operações hoje: ${this.stats.totalOperations}
`;
    await this.sendMessageWithRetry(chatId, status, { parse_mode: 'Markdown' });
  }

  setupSchedules() {
    // Adjust all schedules to Mozambique timezone
    schedule.scheduleJob(`0 ${START_HOUR - 1} * * *`, () => {
      if (!this.forceOperating) this.sendPreOperationsMessage();
    });

    schedule.scheduleJob(`0 ${START_HOUR} * * *`, () => {
      if (!this.forceOperating) this.startOperations();
    });

    schedule.scheduleJob(`0 ${END_HOUR} * * *`, () => {
      if (!this.forceOperating) this.endOperations();
    });
  }

  // Add callback query handler for operation controls
  setupCallbackQueries() {
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      
      if (!this.adminSessions.get(chatId)?.step === 'authenticated') {
        await this.bot.answerCallbackQuery(query.id, { text: '⚠️ Acesso negado!' });
        return;
      }

      switch (query.data) {
        case 'open_ops':
          this.isOperating = true;
          this.forceOperating = true;
          await this.bot.answerCallbackQuery(query.id, { text: '✅ Operações abertas!' });
          this.scheduleNextOperation();
          break;

        case 'close_ops':
          this.isOperating = false;
          this.forceOperating = false;
          if (this.operationTimeout) {
            clearTimeout(this.operationTimeout);
            this.operationTimeout = null;
          }
          await this.bot.answerCallbackQuery(query.id, { text: '🔴 Operações fechadas!' });
          break;
      }
    });
  }

  // Update the admin menu with new commands
  async sendAdminMenu(chatId) {
    const menu = `
🔐 *Login realizado com sucesso!*

Comandos disponíveis:

📊 *Estatísticas*
/stats - Ver estatísticas gerais
/uptime - Tempo de funcionamento do bot

⚙️ *Controle de Operações*
/operations - Menu de controle de operações
/force_open - Forçar abertura de operações
/force_close - Forçar fechamento de operações
/time_until_open - Tempo até abrir
/time_until_close - Tempo até fechar
/stop - Parar operações
/start - Iniciar operações
/force_operation - Forçar uma operação agora

📢 *Comunicação*
/broadcast - Enviar comunicado para o canal
/send_message - Repassar mensagem com botões

⚡️ *Utilitários*
/status - Status atual do bot
/help - Ver esta mensagem
/logout - Encerrar sessão admin
`;

    await this.sendMessageWithRetry(chatId, menu, { parse_mode: 'Markdown' });
  }

  // ... (rest of the class implementation remains the same)
}

try {
  console.log('Starting bot...');
  const bot = new OperationsBot(TOKEN, CHANNEL_ID);
  console.log('Bot started successfully!');

  process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.isOperating = false;
    if (bot.operationTimeout) {
      clearTimeout(bot.operationTimeout);
    }
    process.exit(0);
  });
} catch (error) {
  console.error('Failed to start bot:', error);
}
