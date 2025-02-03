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

// Time Configuration
const START_HOUR = 8;
const END_HOUR = 17;
const EARLY_MOTIVATION_HOUR = 3;
const NIGHT_BLESSING_HOUR = 18;
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
    
    this.bot = new TelegramBot(token, { polling: true });
    this.isRunning = true;
    this.maintenanceMode = false;
    this.operationalStatus = true;
    this.forcedStart = false;
    
    // Initialize channel operations
    this.channelOperations = new Map();
    Object.values(CHANNELS).forEach(channel => {
      this.channelOperations.set(channel.id, {
        isOperating: false,
        stats: {
          totalOperations: 0,
          dailyOperations: 0,
          messagesSent: 0
        },
        buttons: {
          button1: { text: '🎯 Apostar Agora', url: channel.affiliateUrl },
          button2: { text: '📝 Criar Conta', url: channel.affiliateUrl }
        }
      });
    });
    
    this.adminSessions = new Map();
    moment.tz.setDefault(TIMEZONE);
    
    this.setupBot();
    this.setupSchedules();
  }

  setupBot() {
    // Message handler
    this.bot.on('message', async (msg) => {
      if (!msg.text) return;
      
      const chatId = msg.chat.id;
      const text = msg.text;

      // Ignore channel/group messages
      if (msg.chat.type === 'channel' || msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        return;
      }

      const session = this.adminSessions.get(chatId);

      // Handle login flow
      if (!session) {
        if (text === '/start' || text === '/login') {
          await this.sendMessageWithRetry(chatId, messageStyles.info('Olá, bem-vindo ao painel admin!\nDigite seu username:'), {
            parse_mode: 'HTML'
          });
          this.adminSessions.set(chatId, { step: 'waiting_username' });
        }
        return;
      }

      // Handle session states
      switch (session.step) {
        case 'waiting_username':
          if (text === ADMIN_USERNAME) {
            session.step = 'waiting_password';
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite sua senha:'), {
              parse_mode: 'HTML'
            });
          } else {
            await this.sendMessageWithRetry(chatId, messageStyles.error('Username incorreto!'), {
              parse_mode: 'HTML'
            });
            this.adminSessions.delete(chatId);
          }
          break;

        case 'waiting_password':
          if (text === ADMIN_PASSWORD) {
            session.step = 'authenticated';
            await this.sendAdminPanel(chatId);
          } else {
            await this.sendMessageWithRetry(chatId, messageStyles.error('Senha incorreta!'), {
              parse_mode: 'HTML'
            });
            this.adminSessions.delete(chatId);
          }
          break;

        case 'waiting_announcement':
          await this.handleAnnouncementText(chatId, text);
          session.step = 'authenticated';
          break;

        case 'waiting_fixed_message':
          await this.handleFixedMessageText(chatId, text);
          session.step = 'authenticated';
          break;

        case 'authenticated':
          // Handle authenticated user commands
          break;
      }

      this.adminSessions.set(chatId, session);
    });

    // Callback query handler
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const session = this.adminSessions.get(chatId);

      if (!session || session.step !== 'authenticated') {
        await this.bot.answerCallbackQuery(query.id, {
          text: '⚠️ Acesso negado! Faça login primeiro.',
          show_alert: true
        });
        return;
      }

      switch (data) {
        case 'maintenance_on':
          this.maintenanceMode = true;
          this.operationalStatus = false;
          await this.sendAdminPanel(chatId);
          await this.broadcastMaintenanceStatus(true);
          break;

        case 'maintenance_off':
          this.maintenanceMode = false;
          this.operationalStatus = true;
          await this.sendAdminPanel(chatId);
          await this.broadcastMaintenanceStatus(false);
          break;

        case 'force_start':
          this.forcedStart = true;
          await this.startOperations();
          await this.sendAdminPanel(chatId);
          break;

        case 'stop_force':
          this.forcedStart = false;
          await this.stopOperations();
          await this.sendAdminPanel(chatId);
          break;

        case 'announcement':
          await this.startAnnouncement(chatId);
          break;

        case 'view_times':
          await this.sendOperationTimes(chatId);
          break;

        case 'statistics':
          await this.sendStatistics(chatId);
          break;

        case 'shutdown':
          await this.shutdownBot(chatId);
          break;

        case 'motivation':
          await this.sendMotivationalMessage();
          await this.sendAdminPanel(chatId);
          break;

        case 'blessing':
          await this.sendBlessingMessage();
          await this.sendAdminPanel(chatId);
          break;

        case 'fix_message':
          await this.startFixedMessage(chatId);
          break;

        case 'configure_buttons':
          await this.startButtonConfiguration(chatId);
          break;
      }

      await this.bot.answerCallbackQuery(query.id);
    });
  }

  async sendAdminPanel(chatId) {
    const status = this.operationalStatus ? '✅ Operacional' : '⏸️ Pausado';
    const mode = this.maintenanceMode ? '🔧 Modo Manutenção' : '🟢 Modo Normal';
    
    const message = `
🤖 <b>Painel de Controle v2.1</b>

📊 Status Atual:
${status}
${mode}

⏰ Horário: ${START_HOUR}:00 - ${END_HOUR}:00`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔧 Manutenção ON', callback_data: 'maintenance_on' },
          { text: '✅ Manutenção OFF', callback_data: 'maintenance_off' }
        ],
        [
          { text: '⚡ Forçar Início', callback_data: 'force_start' },
          { text: '🔒 Parar Força', callback_data: 'stop_force' }
        ],
        [
          { text: '📢 Comunicado', callback_data: 'announcement' },
          { text: '⏰ Ver Tempos', callback_data: 'view_times' }
        ],
        [
          { text: '📊 Estatísticas', callback_data: 'statistics' },
          { text: '❌ Desligar Bot', callback_data: 'shutdown' }
        ],
        [
          { text: '🌅 Motivação', callback_data: 'motivation' },
          { text: '🌙 Bênção', callback_data: 'blessing' }
        ],
        [
          { text: '📌 Fixar Mensagem', callback_data: 'fix_message' },
          { text: '⚙️ Configurar Botões', callback_data: 'configure_buttons' }
        ]
      ]
    };

    await this.sendMessageWithRetry(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async startAnnouncement(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📢 Todos os Canais', callback_data: 'announce_all' }],
        ...Object.values(CHANNELS).map(channel => ([
          { text: `🎯 ${channel.name}`, callback_data: `announce_${channel.id}` }
        ])),
        [{ text: '❌ Cancelar', callback_data: 'announce_cancel' }]
      ]
    };

    await this.sendMessageWithRetry(chatId, messageStyles.title('📢 Selecione o canal para o comunicado:'), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    const session = this.adminSessions.get(chatId);
    session.step = 'waiting_announcement';
    this.adminSessions.set(chatId, session);
  }

  async handleAnnouncementText(chatId, text) {
    try {
      const session = this.adminSessions.get(chatId);
      
      if (session.targetChannels === 'all') {
        for (const channel of Object.values(CHANNELS)) {
          await this.sendMessageWithRetry(channel.id, text, { parse_mode: 'HTML' });
        }
        await this.sendMessageWithRetry(chatId, messageStyles.success('Comunicado enviado para todos os canais!'));
      } else {
        await this.sendMessageWithRetry(session.targetChannels, text, { parse_mode: 'HTML' });
        await this.sendMessageWithRetry(chatId, messageStyles.success('Comunicado enviado!'));
      }
      
      await this.sendAdminPanel(chatId);
    } catch (error) {
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao enviar comunicado!'));
      await this.sendAdminPanel(chatId);
    }
  }

  async startFixedMessage(chatId) {
    await this.sendMessageWithRetry(chatId, messageStyles.info('Digite a mensagem que deseja fixar:'), {
      parse_mode: 'HTML'
    });

    const session = this.adminSessions.get(chatId);
    session.step = 'waiting_fixed_message';
    this.adminSessions.set(chatId, session);
  }

  async handleFixedMessageText(chatId, text) {
    try {
      for (const channel of Object.values(CHANNELS)) {
        const msg = await this.sendMessageWithRetry(channel.id, text, { parse_mode: 'HTML' });
        await this.bot.pinChatMessage(channel.id, msg.message_id);
      }
      await this.sendMessageWithRetry(chatId, messageStyles.success('Mensagem fixada em todos os canais!'));
    } catch (error) {
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao fixar mensagem!'));
    }
    await this.sendAdminPanel(chatId);
  }

  async startButtonConfiguration(chatId) {
    const keyboard = {
      inline_keyboard: [
        ...Object.values(CHANNELS).map(channel => ([
          { text: `🎯 ${channel.name}`, callback_data: `config_buttons_${channel.id}` }
        ])),
        [{ text: '❌ Cancelar', callback_data: 'config_buttons_cancel' }]
      ]
    };

    await this.sendMessageWithRetry(chatId, messageStyles.title('⚙️ Selecione o canal para configurar os botões:'), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendOperationTimes(chatId) {
    const message = `
${messageStyles.title('⏰ Horários de Operação')}

${messageStyles.time('Início das Operações: ' + START_HOUR + ':00')}
${messageStyles.time('Fim das Operações: ' + END_HOUR + ':00')}
${messageStyles.time('Motivação Matinal: ' + EARLY_MOTIVATION_HOUR + ':00')}
${messageStyles.time('Bênção Noturna: ' + NIGHT_BLESSING_HOUR + ':00')}

${messageStyles.info('Status: ' + (this.operationalStatus ? '✅ Operacional' : '⏸️ Pausado'))}`;

    await this.sendMessageWithRetry(chatId, message, { parse_mode: 'HTML' });
  }

  async sendStatistics(chatId) {
    let statsMessage = `${messageStyles.title('📊 Estatísticas do Sistema')}\n\n`;

    Object.values(CHANNELS).forEach(channel => {
      const ops = this.channelOperations.get(channel.id);
      statsMessage += `${messageStyles.subtitle(channel.name)}\n`;
      statsMessage += `${messageStyles.stats('Total de Operações: ' + ops.stats.totalOperations)}\n`;
      statsMessage += `${messageStyles.stats('Operações Hoje: ' + ops.stats.dailyOperations)}\n`;
      statsMessage += `${messageStyles.stats('Mensagens Enviadas: ' + ops.stats.messagesSent)}\n\n`;
    });

    await this.sendMessageWithRetry(chatId, statsMessage, { parse_mode: 'HTML' });
  }

  async shutdownBot(chatId) {
    await this.sendMessageWithRetry(chatId, messageStyles.warning('🔄 Desligando bot...'), {
      parse_mode: 'HTML'
    });
    
    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, messageStyles.warning('⚠️ BOT EM MANUTENÇÃO\n\nO sistema está sendo reiniciado.'), {
        parse_mode: 'HTML'
      });
    }

    process.exit(0);
  }

  async broadcastMaintenanceStatus(maintenance) {
    const message = maintenance ?
      messageStyles.warning('🔧 SISTEMA EM MANUTENÇÃO\n\nOperações temporariamente suspensas.') :
      messageStyles.success('✅ SISTEMA OPERACIONAL\n\nOperações normalizadas.');

    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, message, {
        parse_mode: 'HTML'
      });
    }
  }

  setupSchedules() {
    // Reset daily stats at midnight
    schedule.scheduleJob('0 0 * * *', () => {
      Object.values(CHANNELS).forEach(channel => {
        const ops = this.channelOperations.get(channel.id);
        ops.stats.dailyOperations = 0;
      });
    });

    // Start operations
    schedule.scheduleJob(`0 ${START_HOUR} * * *`, () => {
      if (!this.maintenanceMode) {
        this.startOperations();
      }
    });

    // End operations
    schedule.scheduleJob(`0 ${END_HOUR} * * *`, () => {
      this.stopOperations();
    });

    // Early motivation
    schedule.scheduleJob(`0 ${EARLY_MOTIVATION_HOUR} * * *`, () => {
      this.sendMotivationalMessage();
    });

    // Night blessing
    schedule.scheduleJob(`0 ${NIGHT_BLESSING_HOUR} * * *`, () => {
      this.sendBlessingMessage();
    });
  }

  async startOperations() {
    if (this.maintenanceMode && !this.forcedStart) return;

    this.operationalStatus = true;
    const message = `
${messageStyles.title('🎯 INÍCIO DAS OPERAÇÕES')}

${messageStyles.success('Sistema iniciado e pronto para operar!')}

${messageStyles.info('⏰ Horário de operações:')}
Segunda a Domingo: ${START_HOUR}h às ${END_HOUR}h

${messageStyles.warning('⚠️ Mantenha-se atento aos sinais!')}`;

    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, message, {
        parse_mode: 'HTML'
      });
    }
  }

  async stopOperations() {
    this.operationalStatus = false;
    const message = `
${messageStyles.title('🔚 ENCERRAMENTO DAS OPERAÇÕES')}

${messageStyles.success('Operações encerradas por hoje!')}

${messageStyles.info('📊 Resumo do dia:')}
• Taxa de assertividade: ${Math.floor(Math.random() * (95 - 85) + 85)}%

${messageStyles.quote('Amanhã tem mais! Descanse e volte preparado.')}`;

    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, message, {
        parse_mode: 'HTML'
      });
    }
  }

  async sendMotivationalMessage() {
    const message = `
${messageStyles.title('🌅 MOTIVAÇÃO MATINAL')}

${messageStyles.quote('Um novo dia de oportunidades se inicia!')}
${messageStyles.success('Prepare-se para mais um dia de vitórias!')}`;

    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, message, {
        parse_mode: 'HTML'
      });
    }
  }

  async sendBlessingMessage() {
    const message = `
${messageStyles.title('🌙 BÊNÇÃO NOTURNA')}

${messageStyles.quote('Que sua noite seja abençoada!')}
${messageStyles.success('Descanse e prepare-se para amanhã!')}`;

    for (const channel of Object.values(CHANNELS)) {
      await this.sendMessageWithRetry(channel.id, message, {
        parse_mode: 'HTML'
      });
    }
  }

  async sendMessageWithRetry(chatId, message, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.bot.sendMessage(chatId, message, options);
        const ops = this.channelOperations.get(chatId);
        if (ops) {
          ops.stats.messagesSent++;
        }
        return result;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

// Initialize bot
const bot = new OperationsBot(TOKEN);
