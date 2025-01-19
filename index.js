const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment');

// Bot configuration
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY';
const CHANNEL_ID = -1002003497082;
const START_HOUR = 8;
const END_HOUR = 19;
const ADMIN_USERNAME = '007';
const ADMIN_PASSWORD = '006007';
const AFFILIATE_URL = 'https://media1.placard.co.mz/redirect.aspx?pid=2197&bid=1690';

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
    
    // Error handling
    this.bot.on('error', (error) => {
      console.error('Bot error:', error);
      this.reconnect();
    });

    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
      this.reconnect();
    });

    console.log('Bot initialized, setting up commands...');
    this.setupCommands();
    this.setupSchedules();
  }

  reconnect() {
    console.log('Attempting to reconnect...');
    setTimeout(() => {
      try {
        this.bot.stopPolling();
        this.bot.startPolling();
        console.log('Reconnected successfully');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.reconnect();
      }
    }, 5000);
  }

  setupCommands() {
    // Send initial test message
    this.sendMessageWithRetry(this.channelId, '🤖 Bot iniciado com sucesso!')
      .then(() => console.log('Test message sent successfully'))
      .catch(error => console.error('Error sending test message:', error));

    this.bot.on('message', async (msg) => {
      try {
        if (!msg.chat || msg.chat.type !== 'private') return;
        
        const chatId = msg.chat.id;
        const text = msg.text || '';
        const session = this.adminSessions.get(chatId) || { step: 'start' };

        console.log(`Received message from ${chatId}: ${text}`);

        if (text.startsWith('/')) {
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
            } else {
              await this.sendMessageWithRetry(chatId, 'Username incorreto. Tente novamente.\nDigite seu username:');
            }
            break;

          case 'password':
            if (text === ADMIN_PASSWORD) {
              session.step = 'authenticated';
              await this.sendAdminMenu(chatId);
            } else {
              await this.sendMessageWithRetry(chatId, 'Senha incorreta. Acesso negado.');
              session.step = 'start';
            }
            break;

          case 'authenticated':
            const currentSession = this.adminSessions.get(chatId);
            if (currentSession.awaitingBroadcast) {
              await this.sendBroadcast(text);
              currentSession.awaitingBroadcast = false;
              await this.sendMessageWithRetry(chatId, '✅ Broadcast enviado.');
              this.adminSessions.set(chatId, currentSession);
            } else if (currentSession.awaitingMessage) {
              await this.sendMessageWithButtons(text);
              currentSession.awaitingMessage = false;
              await this.sendMessageWithRetry(chatId, '✅ Mensagem enviada com botões.');
              this.adminSessions.set(chatId, currentSession);
            }
            break;
        }

        this.adminSessions.set(chatId, session);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
  }

  async sendMessageWithRetry(chatId, message, options = {}, retries = 3) {
    try {
      return await this.bot.sendMessage(chatId, message, options);
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying message send... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.sendMessageWithRetry(chatId, message, options, retries - 1);
      }
      throw error;
    }
  }

  async sendAdminMenu(chatId) {
    const menu = `
🔐 *Login realizado com sucesso!*

Comandos disponíveis:

📊 *Estatísticas*
/stats - Ver estatísticas gerais
/uptime - Tempo de funcionamento do bot

⚙️ *Controle de Operações*
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
        case '/stats':
          await this.sendStats(chatId);
          break;

        case '/uptime':
          await this.sendUptime(chatId);
          break;

        case '/stop':
          this.isOperating = false;
          if (this.operationTimeout) {
            clearTimeout(this.operationTimeout);
            this.operationTimeout = null;
          }
          await this.sendMessageWithRetry(chatId, '🛑 Operações pausadas.');
          break;

        case '/start':
          this.isOperating = true;
          await this.sendMessageWithRetry(chatId, '▶️ Operações iniciadas.');
          this.scheduleNextOperation();
          break;

        case '/force_operation':
          await this.sendOperation(true); // Added parameter to indicate forced operation
          break;

        case '/broadcast':
          session.awaitingBroadcast = true;
          this.adminSessions.set(chatId, session);
          await this.sendMessageWithRetry(chatId, 'Digite a mensagem para broadcast:');
          break;

        case '/send_message':
          session.awaitingMessage = true;
          this.adminSessions.set(chatId, session);
          await this.sendMessageWithRetry(chatId, 'Digite a mensagem para enviar com botões:');
          break;

        case '/status':
          await this.sendStatus(chatId);
          break;

        case '/help':
          await this.sendAdminMenu(chatId);
          break;

        case '/logout':
          this.adminSessions.delete(chatId);
          await this.sendMessageWithRetry(chatId, '👋 Sessão encerrada.');
          break;

        default:
          await this.sendMessageWithRetry(chatId, '❌ Comando não reconhecido. Use /help para ver os comandos disponíveis.');
      }
    } catch (error) {
      console.error('Error handling admin command:', error);
      await this.sendMessageWithRetry(chatId, '❌ Erro ao executar o comando. Tente novamente.');
    }
  }

  async sendStats(chatId) {
    const stats = `
📊 *Estatísticas do Bot*

🎯 Total de operações: ${this.stats.totalOperations}
✅ Operações green: ${this.stats.greenOperations}
📨 Mensagens enviadas: ${this.stats.messagesSent}
📈 Taxa de acerto: ${(this.stats.greenOperations / this.stats.totalOperations * 100 || 0).toFixed(2)}%
`;
    await this.sendMessageWithRetry(chatId, stats, { parse_mode: 'Markdown' });
  }

  async sendUptime(chatId) {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    await this.sendMessageWithRetry(
      chatId,
      `⏱ *Tempo de execução*\n\n${days}d ${hours}h ${minutes}m`,
      { parse_mode: 'Markdown' }
    );
  }

  async sendStatus(chatId) {
    const status = `
🤖 *Status do Bot*

🔄 Operando: ${this.isOperating ? 'Sim' : 'Não'}
⏰ Horário: ${START_HOUR}h às ${END_HOUR}h
📊 Operações hoje: ${this.stats.totalOperations}
`;
    await this.sendMessageWithRetry(chatId, status, { parse_mode: 'Markdown' });
  }

  async sendBroadcast(message) {
    await this.sendMessageWithRetry(
      this.channelId,
      `📢 *COMUNICADO IMPORTANTE*\n\n${message}`,
      { parse_mode: 'Markdown' }
    );
    this.stats.messagesSent++;
  }

  async sendMessageWithButtons(message) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🎯 Apostar Agora', url: AFFILIATE_URL }],
        [{ text: '📝 Criar Conta', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(
      this.channelId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
    this.stats.messagesSent++;
  }

  setupSchedules() {
    // Schedule notification 1 hour before operations start
    schedule.scheduleJob('0 7 * * *', () => {
      this.sendPreOperationsMessage();
    });

    // Schedule operations start
    schedule.scheduleJob('0 8 * * *', () => {
      this.startOperations();
    });

    // Schedule operations end
    schedule.scheduleJob('0 19 * * *', () => {
      this.endOperations();
    });
  }

  async sendPreOperationsMessage() {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 Registrar-se', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(
      this.channelId,
      '🚨 *ATENÇÃO!* Em 1 hora iniciaremos nossas operações!\n\n' +
      '✨ Crie sua conta na casa abaixo novato, vamos começar as operações às 8 horas!\n\n' +
      '🎯 Prepare-se para mais um dia de resultados!',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
    this.stats.messagesSent++;
  }

  async startOperations() {
    this.isOperating = true;
    await this.sendMessageWithRetry(
      this.channelId,
      '🎮 *OPERAÇÕES INICIADAS!*\n\n' +
      '⏰ Horário de operações: 8h às 19h\n' +
      '💰 Prepare sua banca e vamos lucrar!',
      { parse_mode: 'Markdown' }
    );
    this.stats.messagesSent++;
    this.scheduleNextOperation();
  }

  async endOperations() {
    this.isOperating = false;
    if (this.operationTimeout) {
      clearTimeout(this.operationTimeout);
      this.operationTimeout = null;
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 Registrar-se', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(
      this.channelId,
      '🔚 *OPERAÇÕES ENCERRADAS!*\n\n' +
      '📊 Operações todo dia das 8h às 19h\n' +
      '✨ Registre-se na casa certa e comece a operar conosco!\n\n' +
      '⏰ Retornamos amanhã às 8h!',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
    this.stats.messagesSent++;
  }

  scheduleNextOperation() {
    if (!this.isOperating) return;

    const now = moment();
    if (now.hours() >= START_HOUR && now.hours() < END_HOUR) {
      // Generate random wait time between 3-10 minutes
      const waitTime = Math.floor(Math.random() * (10 - 3 + 1) + 3);
      this.operationTimeout = setTimeout(() => this.sendOperation(), waitTime * 60 * 1000);
    }
  }

  async sendOperation(forced = false) {
    if (!this.isOperating && !forced) return;

    try {
      const multiplier = (Math.random() * (6.99 - 1.00) + 1.00).toFixed(2);
      const keyboard = {
        inline_keyboard: [
          [{ text: '🎯 Apostar Agora', url: AFFILIATE_URL }],
          [{ text: '📝 Criar Conta', url: AFFILIATE_URL }]
        ]
      };

      const nextOperationTime = moment().add(3, 'minutes').format('HH:mm');

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

      // Schedule result message
      setTimeout(() => this.sendResult(), 3 * 60 * 1000);
    } catch (error) {
      console.error('Error sending operation:', error);
      if (!forced) {
        this.scheduleNextOperation();
      }
    }
  }

  async sendResult() {
    try {
      const isWin = Math.random() < 0.8; // 80% chance of win
      
      if (isWin) {
        await this.sendMessageWithRetry(
          this.channelId,
          '✅ *GREEN!*\n\nParabéns a todos que seguiram o sinal!',
          { parse_mode: 'Markdown' }
        );
        this.stats.greenOperations++;
        this.stats.messagesSent++;
      }
    } catch (error) {
      console.error('Error sending result:', error);
    } finally {
      this.scheduleNextOperation();
    }
  }
}

try {
  console.log('Starting bot...');
  const bot = new OperationsBot(TOKEN, CHANNEL_ID);
  console.log('Bot started successfully!');

  // Handle process termination
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
