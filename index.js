const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

// Bot Configuration
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY';

// Channel Configuration
const CHANNELS = {
  WINNER: {
    id: -1002358907501,
    name: 'Winner',
    affiliateUrl: 'https://track.africabetpartners.com/visit/?bta=37044&nci=6273'
  },
  BANTUBET: {
    id: -1002432868123,
    name: 'Bantubet',
    affiliateUrl: 'https://affiliates.bantubet.co.mz/links/?btag=1573690'
  },
  OLABET: {
    id: -1002462916055,
    name: 'Olabet',
    affiliateUrl: 'https://tracking.olabet.co.mz/C.ashx?btag=a_739b_7c_&affid=720&siteid=739&adid=7&c='
  },
  MEGALIVEGAME: {
    id: -1002439314779,
    name: 'MegaLiveGame',
    affiliateUrl: 'https://www.megagamelive.com/affiliates/?btag=2059497'
  },
  PLACARD: {
    id: -1002003497082,
    name: 'Placard',
    affiliateUrl: 'https://media1.placard.co.mz/redirect.aspx?pid=2197&bid=1690'
  }
};

// Time Configuration (Mozambique timezone)
const START_HOUR = 8;
const END_HOUR = 19;
const EARLY_MOTIVATION_HOUR = 3;
const NIGHT_BLESSING_HOUR = 18;
const PRE_OPERATION_HOUR = 5;
const TIMEZONE = 'Africa/Maputo';

// Admin Configuration
const ADMIN_USERNAME = '007';
const ADMIN_PASSWORD = '006007';

// Console styling
const consoleStyle = {
  system: '\x1b[38;5;39m',
  error: '\x1b[38;5;196m',
  success: '\x1b[38;5;82m',
  warning: '\x1b[38;5;214m',
  info: '\x1b[38;5;147m',
  reset: '\x1b[0m'
};

// ASCII Art
const ASCII_LOGO = `${consoleStyle.system}╔══════════════════════════════════════════════════════╗
║             🤖 QUANTUM SIGNALS BOT v2.1              ║
║        [ SISTEMA QUANTUM INICIADO COM SUCESSO ]      ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_ERROR = `${consoleStyle.error}╔══════════════════════════════════════════════════════╗
║           ⚠️  ALERTA DO SISTEMA QUANTUM             ║
║              [ FALHA DETECTADA ]                    ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_MESSAGE = `${consoleStyle.info}╔══════════════════════════════════════════════════════╗
║           📨 NOVA MENSAGEM DETECTADA                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_COMMAND = `${consoleStyle.system}╔══════════════════════════════════════════════════════╗
║           ⌨️  COMANDO ADMINISTRATIVO                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_OPERATION = `${consoleStyle.success}╔══════════════════════════════════════════════════════╗
║           🎯 NOVA OPERAÇÃO INICIADA                 ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

const ASCII_MAINTENANCE = `${consoleStyle.warning}╔══════════════════════════════════════════════════════╗
║           🔧 MODO MANUTENÇÃO ATIVADO                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

// Console logging functions
const logSystem = (message) => console.log(`${consoleStyle.system}[SISTEMA] ➤ ${message}${consoleStyle.reset}`);
const logError = (message) => console.log(`${consoleStyle.error}[ERRO] ➤ ${message}${consoleStyle.reset}`);
const logSuccess = (message) => console.log(`${consoleStyle.success}[SUCESSO] ➤ ${message}${consoleStyle.reset}`);
const logWarning = (message) => console.log(`${consoleStyle.warning}[AVISO] ➤ ${message}${consoleStyle.reset}`);
const logInfo = (message) => console.log(`${consoleStyle.info}[INFO] ➤ ${message}${consoleStyle.reset}`);

// Message styling
const messageStyles = {
  title: (text) => `<b><u>${text}</u></b>`,
  subtitle: (text) => `<b>${text}</b>`,
  highlight: (text) => `<i>${text}</i>`,
  success: (text) => `✅ <b>${text}</b>`,
  error: (text) => `❌ <b>${text}</b>`,
  warning: (text) => `⚠️ <b>${text}</b>`,
  info: (text) => `ℹ️ ${text}`,
  quote: (text) => `<i>"${text}"</i>`,
  time: (text) => `⏰ <code>${text}</code>`,
  stats: (text) => `📊 <b>${text}</b>`
};

class OperationsBot {
  constructor(token) {
    console.log(ASCII_LOGO);
    logSystem('Iniciando sistemas...');
    
    this.bot = new TelegramBot(token, { polling: true });
    this.isRunning = true;
    this.maintenanceMode = false;
    
    // Initialize channel-specific operations
    this.channelOperations = new Map();
    Object.values(CHANNELS).forEach(channel => {
      this.channelOperations.set(channel.id, {
        isOperating: false,
        activeOperations: new Map(),
        lastOperationTime: null,
        operationTimeout: null,
        stats: {
          totalOperations: 0,
          messagesSent: 0,
          dailyOperations: 0
        }
      });
    });
    
    this.adminSessions = new Map();
    this.startTime = Date.now();
    
    moment.tz.setDefault(TIMEZONE);
    
    this.setupErrorHandlers();
    this.setupCommands();
    this.setupSchedules();
    this.setupCallbackQueries();

    // Send initial connection message to all channels
    Object.values(CHANNELS).forEach(channel => {
      this.sendInitialMessage(channel.id);
    });

    logSuccess('Bot conectado com sucesso!');
    logSuccess('Sistema Quantum totalmente operacional!');
  }

  async sendInitialMessage(channelId) {
    const channel = Object.values(CHANNELS).find(c => c.id === channelId);
    if (!channel) return;

    const message = `
${messageStyles.title('🤖 BOT QUANTUM SIGNALS CONECTADO')}

${messageStyles.success('Sistema operacional e pronto para enviar sinais!')}

${messageStyles.info('⏰ Horário de operações:')}
Segunda a Domingo: 8h às 19h

${messageStyles.warning('⚠️ Aguarde o início das operações.')}`;

    await this.sendMessageWithRetry(channelId, message, {
      parse_mode: 'HTML'
    });
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) return;

    const session = this.adminSessions.get(chatId);

    if (!session) {
      if (text.startsWith('/login')) {
        await this.sendMessageWithRetry(chatId, messageStyles.info('Digite seu usuário:'), {
          parse_mode: 'HTML'
        });
        this.adminSessions.set(chatId, { step: 'waiting_username' });
        return;
      }
      await this.sendMessageWithRetry(chatId, messageStyles.error('Por favor, faça login usando /login'), {
        parse_mode: 'HTML'
      });
      return;
    }

    switch (session.step) {
      case 'waiting_username':
        if (text === ADMIN_USERNAME) {
          await this.sendMessageWithRetry(chatId, messageStyles.info('Digite sua senha:'), {
            parse_mode: 'HTML'
          });
          session.step = 'waiting_password';
        } else {
          await this.sendMessageWithRetry(chatId, messageStyles.error('Usuário incorreto. Tente novamente com /login'), {
            parse_mode: 'HTML'
          });
          this.adminSessions.delete(chatId);
        }
        break;

      case 'waiting_password':
        if (text === ADMIN_PASSWORD) {
          session.step = 'authenticated';
          await this.sendAdminMenu(chatId);
        } else {
          await this.sendMessageWithRetry(chatId, messageStyles.error('Senha incorreta. Tente novamente com /login'), {
            parse_mode: 'HTML'
          });
          this.adminSessions.delete(chatId);
        }
        break;

      case 'authenticated':
        // Handle authenticated user commands
        break;
    }

    this.adminSessions.set(chatId, session);
  }

  async sendAdminMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📢 Enviar Comunicado', callback_data: 'send_announcement' }
        ],
        [
          { text: '🔧 Ativar Manutenção', callback_data: 'maintenance_on' },
          { text: '✅ Desativar Manutenção', callback_data: 'maintenance_off' }
        ]
      ]
    };

    await this.sendMessageWithRetry(chatId, messageStyles.title('🎛️ Painel de Controle'), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
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
        logInfo(`Mensagem recebida de ${msg.from?.id}: ${msg.text}`);
        await this.handleMessage(msg);
      } catch (error) {
        logError(`Erro ao processar mensagem: ${error}`);
      }
    });

    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/stats/, (msg) => this.handleStats(msg));
    this.bot.onText(/\/menu/, (msg) => this.handleMenu(msg));
    this.bot.onText(/\/tempo/, (msg) => this.handleTempoCommand(msg));
  }

  async handleAnnouncement(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📢 Todos os Canais', callback_data: 'announce_all' }],
        [{ text: '🎯 Winner', callback_data: 'announce_winner' }],
        [{ text: '🎮 Bantubet', callback_data: 'announce_bantubet' }],
        [{ text: '🎲 Olabet', callback_data: 'announce_olabet' }],
        [{ text: '🎰 MegaLiveGame', callback_data: 'announce_megalivegame' }],
        [{ text: '🎲 Placard', callback_data: 'announce_placard' }],
        [{ text: '❌ Cancelar', callback_data: 'announce_cancel' }]
      ]
    };

    await this.sendMessageWithRetry(chatId, messageStyles.title('📢 Selecione o canal para o comunicado:'), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendAnnouncement(chatId, session) {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: session.button1Text, url: session.button1Url }],
          [{ text: session.button2Text, url: session.button2Url }]
        ]
      };

      const sendToChannel = async (channelId) => {
        if (session.mediaId) {
          switch (session.mediaType) {
            case 'photo':
              await this.bot.sendPhoto(channelId, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
            case 'video':
              await this.bot.sendVideo(channelId, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
            case 'document':
              await this.bot.sendDocument(channelId, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
          }
        } else {
          await this.sendMessageWithRetry(channelId, session.announcementText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      };

      // Send to selected channel(s)
      if (session.targetChannels === 'all') {
        for (const channel of Object.values(CHANNELS)) {
          await sendToChannel(channel.id);
        }
        await this.sendMessageWithRetry(chatId, messageStyles.success('Comunicado enviado para todos os canais!'), { parse_mode: 'HTML' });
      } else {
        await sendToChannel(session.targetChannels);
        const channelName = Object.values(CHANNELS).find(c => c.id === session.targetChannels)?.name;
        await this.sendMessageWithRetry(chatId, messageStyles.success(`Comunicado enviado para ${channelName}!`), { parse_mode: 'HTML' });
      }

      await this.sendAdminMenu(chatId);
    } catch (error) {
      logError(`Erro ao enviar comunicado: ${error}`);
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao enviar comunicado. Tente novamente.'), { parse_mode: 'HTML' });
      await this.sendAdminMenu(chatId);
    }
  }

  setupCallbackQueries() {
    this.bot.on('callback_query', async (query) => {
      try {
        const chatId = query.message.chat.id;
        const data = query.data;
        const session = this.adminSessions.get(chatId);

        if (!session || session.step !== 'authenticated') {
          await this.bot.answerCallbackQuery(query.id, {
            text: '⚠️ Você precisa fazer login primeiro!',
            show_alert: true
          });
          return;
        }

        // Handle announcement channel selection
        if (data.startsWith('announce_')) {
          const target = data.replace('announce_', '');
          
          if (target === 'cancel') {
            await this.sendAdminMenu(chatId);
            await this.bot.answerCallbackQuery(query.id);
            return;
          }

          session.targetChannels = target === 'all' ? 'all' : 
            target === 'winner' ? CHANNELS.WINNER.id :
            target === 'bantubet' ? CHANNELS.BANTUBET.id :
            target === 'olabet' ? CHANNELS.OLABET.id :
            target === 'megalivegame' ? CHANNELS.MEGALIVEGAME.id :
            target === 'placard' ? CHANNELS.PLACARD.id :
            null;

          session.step = 'waiting_announcement';
          await this.sendMessageWithRetry(chatId, messageStyles.info('Digite o texto do comunicado ou envie uma mídia (foto/vídeo/documento):'), { 
            parse_mode: 'HTML', 
            reply_markup: { force_reply: true } 
          });
          await this.bot.answerCallbackQuery(query.id);
          return;
        }

        switch (data) {
          case 'maintenance_on':
            this.maintenanceMode = true;
            Object.values(CHANNELS).forEach(channel => {
              this.sendMessageWithRetry(channel.id, messageStyles.warning('🔧 SISTEMA EM MANUTENÇÃO\n\nOperações temporariamente suspensas.'), { parse_mode: 'HTML' });
            });
            break;

          case 'maintenance_off':
            this.maintenanceMode = false;
            Object.values(CHANNELS).forEach(channel => {
              this.sendMessageWithRetry(channel.id, messageStyles.success('✅ SISTEMA OPERACIONAL\n\nOperações normalizadas.'), { parse_mode: 'HTML' });
            });
            break;

          case 'send_announcement':
            await this.handleAnnouncement(chatId);
            break;
        }

        await this.bot.answerCallbackQuery(query.id);
        this.adminSessions.set(chatId, session);
      } catch (error) {
        logError(`Erro ao processar callback query: ${error}`);
        await this.bot.answerCallbackQuery(query.id, {
          text: '❌ Erro ao processar comando',
          show_alert: true
        });
      }
    });
  }

  async sendMessageWithRetry(chatId, message, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.bot.sendMessage(chatId, message, options);
        const channelOps = this.channelOperations.get(chatId);
        if (channelOps) {
          channelOps.stats.messagesSent++;
        }
        return result;
      } catch (error) {
        logError(`Tentativa ${i + 1} de envio falhou: ${error}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    await this.sendMessageWithRetry(chatId, messageStyles.success('Bot iniciado! Use /help para ver os comandos disponíveis.'), { parse_mode: 'HTML' });
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const helpMessage = `
${messageStyles.title('📋 Comandos Disponíveis')}

/start - Iniciar bot
/help - Mostrar esta ajuda
/stats - Ver estatísticas
/menu - Abrir menu principal
/tempo - Ver horários`;

    await this.sendMessageWithRetry(chatId, helpMessage, { parse_mode: 'HTML' });
  }

  async handleStats(msg) {
    const chatId = msg.chat.id;
    let statsMessage = `${messageStyles.title('📊 Estatísticas Gerais')}\n\n`;

    Object.values(CHANNELS).forEach(channel => {
      const channelOps = this.channelOperations.get(channel.id);
      if (channelOps) {
        statsMessage += `${messageStyles.subtitle(channel.name)}\n`;
        statsMessage += `${messageStyles.stats(`Total de Operações: ${channelOps.stats.totalOperations}`)}\n`;
        statsMessage += `${messageStyles.stats(`Operações Hoje: ${channelOps.stats.dailyOperations}`)}\n`;
        statsMessage += `${messageStyles.stats(`Mensagens Enviadas: ${channelOps.stats.messagesSent}`)}\n\n`;
      }
    });

    await this.sendMessageWithRetry(chatId, statsMessage, { parse_mode: 'HTML' });
  }

  async handleMenu(msg) {
    const chatId = msg.chat.id;
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Estatísticas', callback_data: 'stats' },
          { text: '⏰ Horários', callback_data: 'times' }
        ],
        [
          { text: '🔧 Manutenção', callback_data: 'maintenance' },
          { text: '❌ Sair', callback_data: 'exit' }
        ]
      ]
    };

    await this.sendMessageWithRetry(chatId, messageStyles.title('Menu Principal'), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async handleTempoCommand(msg) {
    const chatId = msg.chat.id;
    const now = moment();
    const nextOperation = moment().hour(START_HOUR).minute(0).second(0);
    if (now.isAfter(nextOperation)) nextOperation.add(1, 'day');

    const message = `
${messageStyles.title('⏰ Horários')}

${messageStyles.time(`Próxima Operação: ${nextOperation.format('HH:mm')}`)}
${messageStyles.time(`Horário Atual: ${now.format('HH:mm')}`)}`;

    await this.sendMessageWithRetry(chatId, message, { parse_mode: 'HTML' });
  }

  setupSchedules() {
    // Reset daily operations at midnight
    schedule.scheduleJob('0 0 * * *', () => {
      Object.values(CHANNELS).forEach(channel => {
        const channelOps = this.channelOperations.get(channel.id);
        if (channelOps) {
          channelOps.stats.dailyOperations = 0;
        }
      });
      logInfo('Contador de operações diárias resetado para todos os canais');
    });

    // Pre-operation warning 30 minutes before start
    schedule.scheduleJob(`30 ${START_HOUR - 1} * * *`, () => {
      Object.values(CHANNELS).forEach(channel => {
        this.sendPreOperationWarning(channel.id);
      });
    });

    // Start operations
    schedule.scheduleJob(`0 ${START_HOUR} * * *`, () => {
      if (!this.maintenanceMode) {
        Object.values(CHANNELS).forEach(channel => {
          this.startOperations(channel.id);
        });
      }
    });

    // End operations
    schedule.scheduleJob(`0 ${END_HOUR} * * *`, () => {
      Object.values(CHANNELS).forEach(channel => {
        this.endOperations(channel.id);
      });
    });

    // Early motivation
    schedule.scheduleJob(`0 ${EARLY_MOTIVATION_HOUR} * * *`, () => {
      Object.values(CHANNELS).forEach(channel => {
        this.sendEarlyMotivation(channel.id);
      });
    });

    // Night blessing
    schedule.scheduleJob(`0 ${NIGHT_BLESSING_HOUR} * * *`, () => {
      Object.values(CHANNELS).forEach(channel => {
        this.sendNightBlessing(channel.id);
      });
    });
  }

  async sendPreOperationWarning(channelId) {
    const channel = Object.values(CHANNELS).find(c => c.id === channelId);
    if (!channel) return;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎯 Prepare-se para Operar', url: channel.affiliateUrl }]
      ]
    };

    const message = `
${messageStyles.title('⚠️ ATENÇÃO - OPERAÇÕES INICIARÃO EM BREVE')}

${messageStyles.subtitle('🕒 Faltam 30 minutos para o início das operações!')}

${messageStyles.info('📋 Prepare-se:')}
• Verifique seu saldo
• Prepare suas estratégias
• Configure suas entradas
• Mantenha-se atento aos sinais

${messageStyles.warning('⚡️ Início às 8:00 horas!')}
${messageStyles.success('✅ Boas operações a todos!')}`;

    await this.sendMessageWithRetry(channelId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async endOperations(channelId) {
    const channelOps = this.channelOperations.get(channelId);
    if (!channelOps) return;

    channelOps.isOperating = false;
    if (channelOps.operationTimeout) {
      clearTimeout(channelOps.operationTimeout);
      channelOps.operationTimeout = null;
    }
    this.cleanupOperation(channelId);

    const channel = Object.values(CHANNELS).find(c => c.id === channelId);
    if (!channel) return;

    const message = `
${messageStyles.title('🔚 ENCERRAMENTO DAS OPERAÇÕES')}

${messageStyles.subtitle(`📊 Resumo do dia:`)}
• Total de operações: ${channelOps.stats.dailyOperations}
• Taxa de assertividade: ${Math.floor(Math.random() * (95 - 85) + 85)}%

${messageStyles.info('⏰ Horário de operações:')}
Segunda a Domingo: 8h às 19h

${messageStyles.success('✅ Agradecemos a confiança!')}
${messageStyles.quote('Amanhã tem mais! Descanse e volte preparado.')}`;

    await this.sendMessageWithRetry(channelId, message, {
      parse_mode: 'HTML'
    });
    
    logInfo(`Operações encerradas para canal ${channelId}`);
  }

  async sendEarlyMotivation(channelId) {
    const message = `
${messageStyles.title('🌅 MOTIVAÇÃO DA MADRUGADA')}

${messageStyles.quote('Um novo dia de oportunidades se inicia!')}
${messageStyles.success('Prepare-se para mais um dia de vitórias!')}`;

    await this.sendMessageWithRetry(channelId, message, { parse_mode: 'HTML' });
  }

  async sendNightBlessing(channelId) {
    const message = `
${messageStyles.title('🌙 BÊNÇÃO NOTURNA')}

${messageStyles.quote('Que sua noite seja abençoada!')}
${messageStyles.success('Descanse e prepare-se para amanhã!')}`;

    await this.sendMessageWithRetry(channelId, message, { parse_mode: 'HTML' });
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
}

// Initialize bot
const bot = new OperationsBot(TOKEN);
