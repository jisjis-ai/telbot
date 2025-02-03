const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { channels, config } = require('./config');
const ChannelManager = require('./channelManager');
const { messageStyles } = require('./styles');

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
║             🤖 QUANTUM SIGNALS BOT v2.1              ║
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

const ASCII_MAINTENANCE = `
${consoleStyle.warning}╔══════════════════════════════════════════════════════╗
║           🔧 MODO MANUTENÇÃO ATIVADO                ║
╚══════════════════════════════════════════════════════╝${consoleStyle.reset}`;

// Console logging functions
const logSystem = (message) => console.log(`${consoleStyle.system}[SISTEMA] ➤ ${message}${consoleStyle.reset}`);
const logError = (message) => console.log(`${consoleStyle.error}[ERRO] ➤ ${message}${consoleStyle.reset}`);
const logSuccess = (message) => console.log(`${consoleStyle.success}[SUCESSO] ➤ ${message}${consoleStyle.reset}`);
const logWarning = (message) => console.log(`${consoleStyle.warning}[AVISO] ➤ ${message}${consoleStyle.reset}`);
const logInfo = (message) => console.log(`${consoleStyle.info}[INFO] ➤ ${message}${consoleStyle.reset}`);

class MultiChannelBot {
  constructor() {
    console.log(ASCII_LOGO);
    logSystem('Iniciando sistemas...');
    logSystem('Carregando módulos...');
    logSystem('Estabelecendo conexão com Telegram API...');

    this.bot = new TelegramBot(config.TOKEN, { polling: true });
    this.channelManagers = new Map();
    this.adminSessions = new Map();
    this.maintenanceMode = false;
    this.stats = {
      totalOperations: 0,
      messagesSent: 0,
      dailyOperations: 0,
      maintenanceCount: 0,
      lastMaintenanceDate: null,
      systemUptime: Date.now()
    };
    this.startTime = Date.now();
    this.forceOperating = false;
    this.customStartHour = config.START_HOUR;
    this.customEndHour = config.END_HOUR;
    this.pinnedMessageId = null;
    this.pinnedMessageTimer = null;
    
    // Initialize channel managers
    Object.values(channels).forEach(channel => {
      this.channelManagers.set(channel.id, new ChannelManager(this.bot, channel));
    });

    this.setupErrorHandlers();
    this.setupCommands();
    this.setupSchedules();
    this.setupCallbackQueries();
    
    logSuccess('Conexão estabelecida com sucesso!');
    logSystem('Configurando manipuladores de eventos...');
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

  setupSchedules() {
    logSystem('Configurando agendamentos...');
    
    // Reset daily stats at midnight
    schedule.scheduleJob('0 0 * * *', () => {
      this.channelManagers.forEach(manager => {
        manager.stats.dailyOperations = 0;
      });
      this.stats.dailyOperations = 0;
      logInfo('Contador de operações diárias resetado');
    });

    // Early morning motivation
    schedule.scheduleJob(`0 ${config.EARLY_MOTIVATION_HOUR} * * *`, () => {
      logInfo('Enviando mensagem motivacional da madrugada');
      this.channelManagers.forEach(manager => {
        manager.sendMotivationalMessage();
      });
    });

    // Pre-operation notice
    schedule.scheduleJob(`0 ${config.PRE_OPERATION_HOUR} * * *`, () => {
      logInfo('Enviando aviso de início de operações');
      this.channelManagers.forEach(manager => {
        manager.sendPreOperationNotice();
      });
    });

    // Start operations
    schedule.scheduleJob(`0 ${config.START_HOUR} * * *`, () => {
      if (!this.maintenanceMode) {
        logInfo('Iniciando operações programadas');
        this.channelManagers.forEach(manager => {
          manager.startOperations();
        });
      }
    });

    // End operations
    schedule.scheduleJob(`0 ${config.END_HOUR} * * *`, () => {
      logInfo('Encerrando operações programadas');
      this.channelManagers.forEach(manager => {
        manager.stopOperations();
        manager.sendEndOperationNotice();
      });
    });

    // Night blessing
    schedule.scheduleJob(`0 ${config.NIGHT_BLESSING_HOUR} * * *`, () => {
      logInfo('Enviando bênção noturna');
      this.channelManagers.forEach(manager => {
        manager.sendNightBlessing();
      });
    });

    // System health check every hour
    schedule.scheduleJob('0 * * * *', () => {
      this.performHealthCheck();
    });

    logSuccess('Agendamentos configurados com sucesso');
  }

  async performHealthCheck() {
    const uptime = moment.duration(Date.now() - this.stats.systemUptime).humanize();
    const currentHour = moment().hour();
    const shouldBeOperating = currentHour >= config.START_HOUR && currentHour < config.END_HOUR;

    this.channelManagers.forEach(manager => {
      if (shouldBeOperating && !manager.isOperating && !this.maintenanceMode) {
        logWarning(`Sistema detectou inconsistência no estado de operação do canal ${manager.channel.name}`);
        manager.startOperations();
      }

      if (!shouldBeOperating && manager.isOperating && !this.forceOperating) {
        logWarning(`Sistema detectou operações fora do horário no canal ${manager.channel.name}`);
        manager.stopOperations();
      }
    });

    logInfo(`Verificação de saúde do sistema - Uptime: ${uptime}`);
  }

  setupCommands() {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendAdminLogin(chatId);
    });

    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      if (await this.isAdmin(chatId)) {
        await this.sendStats(chatId);
      }
    });

    // Adicionar novo comando
    this.bot.onText(/\/tempo/, (msg) => this.handleTempoCommand(msg));

    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/')) {
        await this.handleMessage(msg);
      }
    });

    // Comandos de controle
    this.bot.onText(/\/desligar/, async (msg) => {
      if (await this.isAdmin(msg.chat.id)) {
        await this.sendMessageWithRetry(msg.chat.id, messageStyles.warning('Desligando o bot...'), { parse_mode: 'HTML' });
        this.isRunning = false;
        process.exit(0);
      }
    });

    this.bot.onText(/\/reiniciar/, async (msg) => {
      if (await this.isAdmin(msg.chat.id)) {
        await this.sendMessageWithRetry(msg.chat.id, messageStyles.warning('Reiniciando o bot...'), { parse_mode: 'HTML' });
        this.isRunning = false;
        process.on("exit", () => {
          require("child_process").spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: "inherit"
          });
        });
        process.exit();
      }
    });

    this.bot.onText(/\/ligar/, async (msg) => {
      if (await this.isAdmin(msg.chat.id)) {
        if (!this.isRunning) {
          this.isRunning = true;
          await this.sendMessageWithRetry(msg.chat.id, messageStyles.success('Bot ativado com sucesso!'), { parse_mode: 'HTML' });
          this.setupSchedules();
        } else {
          await this.sendMessageWithRetry(msg.chat.id, messageStyles.info('Bot já está em execução!'), { parse_mode: 'HTML' });
        }
      }
    });

    // Menu e outros comandos
    this.bot.onText(/\/menu/, async (msg) => {
      if (await this.isAdmin(msg.chat.id)) {
        await this.sendAdminMenu(msg.chat.id);
      }
    });
  }

  async sendMessageWithRetry(chatId, message, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.bot.sendMessage(chatId, message, options);
        this.stats.messagesSent++;
        logInfo(`Mensagem enviada para ${chatId}`);
        return result;
      } catch (error) {
        logError(`Tentativa ${i + 1} de envio falhou: ${error}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async handleTempoCommand(msg) {
    const chatId = msg.chat.id;
    const now = moment();
    
    // Calcular tempos restantes
    const nextOperation = moment().hour(config.START_HOUR).minute(0).second(0);
    if (now.isAfter(nextOperation)) {
      nextOperation.add(1, 'day');
    }

    const nextMotivation = moment().hour(config.EARLY_MOTIVATION_HOUR).minute(0).second(0);
    if (now.isAfter(nextMotivation)) {
      nextMotivation.add(1, 'day');
    }

    const operationsEnd = moment().hour(config.END_HOUR).minute(0).second(0);
    if (now.isAfter(operationsEnd)) {
      operationsEnd.add(1, 'day');
    }

    const nightBlessing = moment().hour(config.NIGHT_BLESSING_HOUR).minute(0).second(0);
    if (now.isAfter(nightBlessing)) {
      nightBlessing.add(1, 'day');
    }

    const message = `
${messageStyles.title('⏰ TEMPOS RESTANTES')}

${messageStyles.subtitle('🌅 Próxima Motivação:')}
${messageStyles.time(moment.duration(nextMotivation.diff(now)).format('HH:mm:ss'))}

${messageStyles.subtitle('🎯 Próximas Operações:')}
${messageStyles.time(moment.duration(nextOperation.diff(now)).format('HH:mm:ss'))}

${messageStyles.subtitle('🔚 Fim das Operações:')}
${messageStyles.time(moment.duration(operationsEnd.diff(now)).format('HH:mm:ss'))}

${messageStyles.subtitle('🌙 Bênção Noturna:')}
${messageStyles.time(moment.duration(nightBlessing.diff(now)).format('HH:mm:ss'))}

${messageStyles.info('Horário atual em Moçambique:')}
${messageStyles.time(now.format('HH:mm:ss'))}`;

    await this.sendMessageWithRetry(chatId, message, { parse_mode: 'HTML' });
  }

  async sendAdminLogin(chatId) {
    const session = { step: 'username' };
    this.adminSessions.set(chatId, session);
    
    await this.bot.sendMessage(chatId, 
      messageStyles.info('Bem-vindo ao Painel Admin!\nDigite seu username:'),
      { parse_mode: 'HTML' }
    );
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
          await this.sendMessageWithRetry(chatId, messageStyles.info('Olá, bem-vindo ao painel admin!\nDigite seu username:'), { parse_mode: 'HTML' });
          session.step = 'username';
          break;

        case 'username':
          if (text === config.ADMIN_USERNAME) {
            session.step = 'password';
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite sua senha:'), { parse_mode: 'HTML' });
            logInfo(`Tentativa de login: username correto de ${chatId}`);
          } else {
            await this.sendMessageWithRetry(chatId, messageStyles.error('Username incorreto. Tente novamente.\nDigite seu username:'), { parse_mode: 'HTML' });
            logWarning(`Tentativa de login: username incorreto de ${chatId}`);
          }
          break;

        case 'password':
          if (text === config.ADMIN_PASSWORD) {
            session.step = 'authenticated';
            await this.sendAdminMenu(chatId);
            logSuccess(`Login bem-sucedido: ${chatId}`);
          } else {
            session.step = 'username';
            await this.sendMessageWithRetry(chatId, messageStyles.error('Senha incorreta. Acesso negado.'), { parse_mode: 'HTML' });
            logWarning(`Tentativa de login: senha incorreta de ${chatId}`);
          }
          break;

        case 'waiting_announcement':
          if (msg.photo || msg.video || msg.document) {
            session.mediaType = msg.photo ? 'photo' : msg.video ? 'video' : 'document';
            session.mediaId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : 
                           msg.video ? msg.video.file_id : 
                           msg.document.file_id;
            await this.sendMessageWithRetry(chatId, messageStyles.info('Agora digite o texto do comunicado:'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
            session.step = 'waiting_announcement_text';
          } else {
            session.announcementText = msg.text;
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite o texto para o primeiro botão:'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
            session.step = 'waiting_button1_text';
          }
          break;

        case 'waiting_announcement_text':
          session.announcementText = msg.text;
          await this.sendMessageWithRetry(chatId, messageStyles.info('Digite o texto para o primeiro botão:'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
          session.step = 'waiting_button1_text';
          break;

        case 'waiting_button1_text':
          session.button1Text = text;
          await this.sendMessageWithRetry(
            chatId,
            messageStyles.info('Digite o link para o primeiro botão:'),
            { parse_mode: 'HTML', reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button1_url';
          break;

        case 'waiting_button1_url':
          session.button1Url = text;
          await this.sendMessageWithRetry(
            chatId,
            messageStyles.info('Digite o texto para o segundo botão:'),
            { parse_mode: 'HTML', reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button2_text';
          break;

        case 'waiting_button2_text':
          session.button2Text = text;
          await this.sendMessageWithRetry(
            chatId,
            messageStyles.info('Digite o link para o segundo botão:'),
            { parse_mode: 'HTML', reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button2_url';
          break;

        case 'waiting_button2_url':
          session.button2Url = text;
          await this.sendAnnouncement(chatId, session);
          session.step = 'authenticated';
          break;

        case 'waiting_pin_message':
          await this.sendPinnedMessage(chatId, text);
          session.step = 'authenticated';
          break;

        default:
          session.step = 'authenticated';
          await this.sendAdminMenu(chatId);
          break;
      }

      this.adminSessions.set(chatId, session);
    } catch (error) {
      logError(`Erro ao processar mensagem: ${error}`);
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao processar mensagem. Tente novamente.'), { parse_mode: 'HTML' });
    }
  }

  async handleAdminCommand(chatId, command) {
    const session = this.adminSessions.get(chatId);
    if (!session || session.step !== 'authenticated') {
      await this.sendMessageWithRetry(chatId, messageStyles.warning('Você precisa fazer login primeiro!'), { parse_mode: 'HTML' });
      return;
    }

    switch (command) {
      case '/stats':
        await this.sendStats(chatId);
        break;
      case '/menu':
        await this.sendAdminMenu(chatId);
        break;
      case '/help':
        await this.sendHelp(chatId);
        break;
      case '/report':
        await this.sendDailyReport(chatId);
        break;
      case '/morning':
        this.channelManagers.forEach(manager => manager.sendMotivationalMessage());
        break;
      case '/night':
        this.channelManagers.forEach(manager => manager.sendNightBlessing());
        break;
      default:
        await this.sendMessageWithRetry(chatId, messageStyles.error('Comando não reconhecido. Use /help para ver os comandos disponíveis.'), { parse_mode: 'HTML' });
    }
  }

  async sendAdminMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔧 Manutenção ON', callback_data: 'maintenance_on' },
          { text: '✅ Manutenção OFF', callback_data: 'maintenance_off' }
        ],
        [
          { text: '⚡️ Forçar Início', callback_data: 'force_start' },
          { text: '🔒 Parar Força', callback_data: 'force_stop' }
        ],
        [
          { text: '📢 Comunicado', callback_data: 'send_announcement' },
          { text: '⏰ Ver Tempos', callback_data: 'view_times' }
        ],
        [
          { text: '📊 Estatísticas', callback_data: 'view_stats' },
          { text: '❌ Desligar Bot', callback_data: 'shutdown' }
        ],
        [
          { text: '🌅 Motivação', callback_data: 'send_early_motivation' },
          { text: '🌙 Bênção', callback_data: 'send_night_blessing' }
        ],
        [
          { text: '📌 Fixar Mensagem', callback_data: 'pin_message' },
          { text: '⚙️ Configurar Botões', callback_data: 'config_buttons' }
        ]
      ]
    };

    const status = `
${messageStyles.title('🤖 Painel de Controle v2.1')}

${messageStyles.subtitle('📊 Status Atual:')}
${this.maintenanceMode ? messageStyles.warning('Em Manutenção') : messageStyles.success('Operacional')}
${this.isOperating ? messageStyles.info('▶️ Operando') : messageStyles.info('⏹️ Pausado')}
${this.forceOperating ? messageStyles.warning('⚡️ Modo Força Ativo') : messageStyles.info('🔒 Modo Normal')}

${messageStyles.time(`Horário: ${this.customStartHour}:00 - ${this.customEndHour}:00`)}`;

    await this.sendMessageWithRetry(chatId, status, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendStats(chatId) {
    let statsMessage = messageStyles.title('📊 Estatísticas Gerais\n\n');

    this.channelManagers.forEach((manager, channelId) => {
      const stats = manager.getStats();
      statsMessage += `
${messageStyles.subtitle(`${stats.channelName}:`)}
${messageStyles.stats(`Total de Operações: ${stats.totalOperations}`)}
${messageStyles.stats(`Operações Hoje: ${stats.dailyOperations}`)}
${messageStyles.stats(`Status: ${stats.isOperating ? '✅ Operando' : '⏸️ Pausado'}`)}
`;
    });

    await this.sendMessageWithRetry(chatId, statsMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendHelp(chatId) {
    const help = `
${messageStyles.title('ℹ️ Comandos Disponíveis')}

${messageStyles.subtitle('Comandos Principais:')}
🔹 /menu - Mostra o menu principal
🔹 /stats - Mostra estatísticas do sistema
🔹 /report - Gera relatório diário
🔹 /morning - Envia mensagem motivacional
🔹 /night - Envia bênção noturna
🔹 /tempo - Mostra tempos restantes

${messageStyles.subtitle('Comandos de Controle:')}
🔹 /ligar - Liga o bot
🔹 /desligar - Desliga o bot
🔹 /reiniciar - Reinicia o bot
🔹 /help - Mostra esta mensagem`;

    await this.sendMessageWithRetry(chatId, help, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendDailyReport(chatId) {
    const report = `
${messageStyles.title('📋 Relatório Diário')}

${messageStyles.stats(`📊 Operações Realizadas: ${this.stats.dailyOperations}`)}
${messageStyles.stats(`📈 Taxa de Sucesso: ${((this.stats.dailyOperations / this.stats.totalOperations) * 100).toFixed(2)}%`)}
${messageStyles.stats(`⏱️ Tempo em Operação: ${moment.duration(Date.now() - this.startTime).humanize()}`)}

${messageStyles.time(`Data: ${moment().format('DD/MM/YYYY')}`)}
${messageStyles.time(`Hora: ${moment().format('HH:mm:ss')}`)}`;

    await this.sendMessageWithRetry(chatId, report, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendPinnedMessage(chatId, text) {
    try {
      if (this.pinnedMessageId) {
        await this.bot.deleteMessage(this.channelId, this.pinnedMessageId);
      }

      const result = await this.sendMessageWithRetry(this.channelId, text, { parse_mode: 'HTML' });
      this.pinnedMessageId = result.message_id;
      await this.bot.pinChatMessage(this.channelId, this.pinnedMessageId);
      
      await this.sendMessageWithRetry(chatId, messageStyles.success('Mensagem fixada com sucesso!'), { parse_mode: 'HTML' });
      await this.sendAdminMenu(chatId);
    } catch (error) {
      logError(`Erro ao fixar mensagem: ${error}`);
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao fixar mensagem. Tente novamente.'), { parse_mode: 'HTML' });
      await this.sendAdminMenu(chatId);
    }
  }

  async sendAnnouncement(chatId, session) {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: session.button1Text, url: session.button1Url }],
          [{ text: session.button2Text, url: session.button2Url }]
        ]
      };

      this.channelManagers.forEach(async (manager) => {
        if (session.mediaId) {
          switch (session.mediaType) {
            case 'photo':
              await this.bot.sendPhoto(manager.channel.id, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
            case 'video':
              await this.bot.sendVideo(manager.channel.id, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
            case 'document':
              await this.bot.sendDocument(manager.channel.id, session.mediaId, {
                caption: session.announcementText,
                parse_mode: 'HTML',
                reply_markup: keyboard
              });
              break;
          }
        } else {
          await this.sendMessageWithRetry(manager.channel.id, session.announcementText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      });

      await this.sendMessageWithRetry(chatId, messageStyles.success('Comunicado enviado com sucesso!'), { parse_mode: 'HTML' });
      await this.sendAdminMenu(chatId);
    } catch (error) {
      logError(`Erro ao enviar comunicado: ${error}`);
      await this.sendMessageWithRetry(chatId, messageStyles.error('Erro ao enviar comunicado. Tente novamente.'), { parse_mode: 'HTML' });
      await this.sendAdminMenu(chatId);
    }
  }

  setupCallbackQueries() {
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const session = this.adminSessions.get(chatId);

      if (!session || session.step !== 'authenticated') {
        await this.bot.answerCallbackQuery(query.id, {
          text: '⚠️ Você precisa fazer login primeiro!',
          show_alert: true
        });
        return;
      }

      try {
        switch (query.data) {
          case 'maintenance_on':
            this.maintenanceMode = true;
            this.stats.maintenanceCount++;
            this.stats.lastMaintenance Date = moment().format('DD/MM/YYYY HH:mm:ss');
            this.channelManagers.forEach(async (manager) => {
              await this.sendMessageWithRetry(manager.channel.id, messageStyles.warning('🔧 SISTEMA EM MANUTENÇÃO\n\nOperações temporariamente suspensas.'), { parse_mode: 'HTML' });
              manager.stopOperations();
            });
            break;

          case 'maintenance_off':
            this.maintenanceMode = false;
            this.channelManagers.forEach(async (manager) => {
              await this.sendMessageWithRetry(manager.channel.id, messageStyles.success('✅ SISTEMA OPERACIONAL\n\nOperações normalizadas.'), { parse_mode: 'HTML' });
              if (this.isInOperatingHours()) {
                manager.startOperations();
              }
            });
            break;

          case 'force_start':
            this.forceOperating = true;
            this.channelManagers.forEach(manager => manager.startOperations());
            break;

          case 'force_stop':
            this.forceOperating = false;
            if (!this.isInOperatingHours()) {
              this.channelManagers.forEach(manager => manager.stopOperations());
            }
            break;

          case 'send_announcement':
            session.step = 'waiting_announcement';
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite o texto do comunicado ou envie uma mídia (foto/vídeo/documento):'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
            break;

          case 'config_buttons':
            session.step = 'waiting_button1_text';
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite o texto para o primeiro botão:'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
            break;

          case 'pin_message':
            session.step = 'waiting_pin_message';
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite a mensagem que deseja fixar:'), { parse_mode: 'HTML', reply_markup: { force_reply: true } });
            break;

          case 'view_stats':
            await this.sendStats(chatId);
            break;

          case 'view_times':
            await this.handleTempoCommand({ chat: { id: chatId } });
            break;

          case 'send_early_motivation':
            this.channelManagers.forEach(manager => manager.sendMotivationalMessage());
            break;

          case 'send_night_blessing':
            this.channelManagers.forEach(manager => manager.sendNightBlessing());
            break;

          case 'system_info':
            await this.sendSystemInfo(chatId);
            break;

          case 'maintenance_stats':
            await this.sendMaintenanceStats(chatId);
            break;

          case 'back_to_menu':
            await this.sendAdminMenu(chatId);
            break;

          case 'shutdown':
            await this.sendMessageWithRetry(chatId, messageStyles.warning('Desligando o bot...'), { parse_mode: 'HTML' });
            process.exit(0);
            break;

          default:
            if (query.data.startsWith('stats_')) {
              const channelId = query.data.split('_')[1];
              const manager = this.channelManagers.get(parseInt(channelId));
              if (manager) {
                const stats = manager.getStats();
                const statsMessage = `
${messageStyles.title(`📊 Estatísticas ${stats.channelName}`)}

${messageStyles.stats(`Total de Operações: ${stats.totalOperations}`)}
${messageStyles.stats(`Operações Hoje: ${stats.dailyOperations}`)}
${messageStyles.stats(`Status: ${stats.isOperating ? '✅ Operando' : '⏸️ Pausado'}`)}`;

                await this.sendMessageWithRetry(chatId, statsMessage, {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
                  }
                });
              }
            }
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

  isInOperatingHours() {
    const currentHour = moment().hour();
    return currentHour >= config.START_HOUR && currentHour < config.END_HOUR;
  }

  async isAdmin(chatId) {
    const session = this.adminSessions.get(chatId);
    return session && session.step === 'authenticated';
  }
}

// Initialize the multi-channel bot
const bot = new MultiChannelBot();