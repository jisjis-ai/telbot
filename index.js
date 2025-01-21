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
      messagesSent: 0,
      dailyOperations: 0
    };
    this.adminSessions = new Map();
    this.startTime = Date.now();
    this.operationTimeout = null;
    this.forceOperating = false;
    this.customStartHour = START_HOUR;
    this.customEndHour = END_HOUR;
    this.pinnedMessageId = null;
    this.pinnedMessageTimer = null;
    this.customButtons = {
      button1: {
        text: '🎯 Apostar Agora',
        url: AFFILIATE_URL
      },
      button2: {
        text: '📝 Criar Conta',
        url: AFFILIATE_URL
      }
    };

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

        case 'waiting_announcement':
          session.announcementText = text;
          await this.sendMessageWithRetry(
            chatId,
            'Digite o texto para o primeiro botão:',
            { reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button1_text';
          break;

        case 'waiting_button1_text':
          session.button1Text = text;
          await this.sendMessageWithRetry(
            chatId,
            'Digite o link para o primeiro botão:',
            { reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button1_url';
          break;

        case 'waiting_button1_url':
          session.button1Url = text;
          await this.sendMessageWithRetry(
            chatId,
            'Digite o texto para o segundo botão:',
            { reply_markup: { force_reply: true } }
          );
          session.step = 'waiting_button2_text';
          break;

        case 'waiting_button2_text':
          session.button2Text = text;
          await this.sendMessageWithRetry(
            chatId,
            'Digite o link para o segundo botão:',
            { reply_markup: { force_reply: true } }
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
      await this.sendMessageWithRetry(chatId, '❌ Erro ao processar mensagem. Tente novamente.');
    }
  }

  async handleAdminCommand(chatId, command) {
    const session = this.adminSessions.get(chatId);
    if (!session || session.step !== 'authenticated') {
      await this.sendMessageWithRetry(chatId, '⚠️ Você precisa fazer login primeiro!');
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
        await this.sendMorningMotivation();
        break;
      case '/night':
        await this.sendNightBlessing();
        break;
      default:
        await this.sendMessageWithRetry(chatId, '❌ Comando não reconhecido. Use /help para ver os comandos disponíveis.');
    }
  }

  async sendAdminMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '▶️ Iniciar Operações', callback_data: 'start_ops' },
          { text: '⏹️ Parar Operações', callback_data: 'stop_ops' }
        ],
        [
          { text: '⚡️ Forçar Início', callback_data: 'force_start' },
          { text: '🔒 Parar Força', callback_data: 'force_stop' }
        ],
        [
          { text: '📢 Enviar Comunicado', callback_data: 'send_announcement' },
          { text: '⚙️ Configurar Botões', callback_data: 'config_buttons' }
        ],
        [
          { text: '📌 Fixar Mensagem', callback_data: 'pin_message' },
          { text: '📊 Ver Estatísticas', callback_data: 'view_stats' }
        ],
        [
          { text: '🌅 Mensagem Motivacional', callback_data: 'morning_motivation' },
          { text: '🌙 Bênção Noturna', callback_data: 'night_blessing' }
        ]
      ]
    };

    await this.sendMessageWithRetry(
      chatId,
      '🎮 *Painel de Controle*\n\n' +
      '✅ Login realizado com sucesso!\n' +
      '📊 Selecione uma opção abaixo:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
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

          case 'send_announcement':
            await this.sendMessageWithRetry(
              chatId,
              'Digite o texto do comunicado:',
              { reply_markup: { force_reply: true } }
            );
            session.step = 'waiting_announcement';
            break;

          case 'config_buttons':
            await this.sendButtonConfig(chatId);
            break;

          case 'pin_message':
            await this.sendMessageWithRetry(
              chatId,
              'Digite a mensagem que deseja fixar:',
              { reply_markup: { force_reply: true } }
            );
            session.step = 'waiting_pin_message';
            break;

          case 'view_stats':
            await this.sendStats(chatId);
            break;

          case 'morning_motivation':
            await this.sendMorningMotivation();
            await this.sendMessageWithRetry(chatId, '✅ Mensagem motivacional enviada com sucesso!');
            break;

          case 'night_blessing':
            await this.sendNightBlessing();
            await this.sendMessageWithRetry(chatId, '✅ Bênção noturna enviada com sucesso!');
            break;

          case 'back_to_menu':
            await this.sendAdminMenu(chatId);
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
    
    // Reset daily stats at midnight
    schedule.scheduleJob('0 0 * * *', () => {
      this.stats.dailyOperations = 0;
      logInfo('Contador de operações diárias resetado');
    });

    // Morning motivation at 7 AM
    schedule.scheduleJob('0 7 * * *', () => {
      logInfo('Enviando mensagem motivacional matinal');
      this.sendMorningMotivation();
    });

    // Start operations at configured start hour
    schedule.scheduleJob(`0 ${this.customStartHour} * * *`, () => {
      logInfo('Iniciando operações programadas');
      this.startOperations();
    });

    // End operations at configured end hour
    schedule.scheduleJob(`0 ${this.customEndHour} * * *`, () => {
      logInfo('Encerrando operações programadas');
      this.endOperations();
    });

    // Night blessing at 20:00
    schedule.scheduleJob('0 20 * * *', () => {
      logInfo('Enviando bênção noturna');
      this.sendNightBlessing();
    });

    logSuccess('Agendamentos configurados com sucesso');
  }

  async sendOperation() {
    if (!this.isOperating) return;

    try {
      console.log(ASCII_OPERATION);
      const multiplier = (Math.random() * (20.99 - 1.00) + 1.00).toFixed(2);
      const keyboard = {
        inline_keyboard: [
          [{ text: this.customButtons.button1.text, url: this.customButtons.button1.url }],
          [{ text: this.customButtons.button2.text, url: this.customButtons.button2.url }]
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

  async sendResult() {
    try {
      await this.sendMessageWithRetry(
        this.channelId,
        `🔄 *OPERAÇÃO ENCERRADA*\n\n` +
        `📊 Próxima operação em breve!`,
        { parse_mode: 'Markdown' }
      );

      this.scheduleNextOperation();
    } catch (error) {
      logError(`Erro ao enviar resultado: ${error}`);
      this.scheduleNextOperation();
    }
  }

  scheduleNextOperation() {
    if (!this.isOperating) return;

    const now = moment();
    const hour = now.hour();

    if ((hour >= this.customStartHour && hour < this.customEndHour) || this.forceOperating) {
      const delay = Math.floor(Math.random() * (180000 - 60000) + 60000); // 1-3 minutes
      this.operationTimeout = setTimeout(() => this.sendOperation(), delay);
      logInfo(`Próxima operação agendada para ${moment().add(delay, 'milliseconds').format('HH:mm:ss')}`);
    } else {
      this.isOperating = false;
      logInfo('Fora do horário de operações');
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

      const message = await this.sendMessageWithRetry(
        this.channelId,
        session.announcementText,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );

      await this.sendMessageWithRetry(
        chatId,
        '✅ Comunicado enviado com sucesso!\n\nDeseja fixar esta mensagem por 24 horas?',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Sim', callback_data: `pin_${message.message_id}` },
                { text: '❌ Não', callback_data: 'no_pin' }
              ]
            ]
          }
        }
      );
    } catch (error) {
      logError(`Erro ao enviar comunicado: ${error}`);
      await this.sendMessageWithRetry(chatId, '❌ Erro ao enviar comunicado. Tente novamente.');
    }
  }

  async sendPinnedMessage(chatId, text) {
    try {
      // Unpin previous message if exists
      if (this.pinnedMessageId) {
        await this.bot.unpinChatMessage(this.channelId, this.pinnedMessageId);
      }

      // Clear previous timer if exists
      if (this.pinnedMessageTimer) {
        clearTimeout(this.pinnedMessageTimer);
      }

      // Send and pin new message
      const message = await this.sendMessageWithRetry(this.channelId, text, { parse_mode: 'Markdown' });
      await this.bot.pinChatMessage(this.channelId, message.message_id);
      
      this.pinnedMessageId = message.message_id;

      // Schedule unpin after 24 hours
      this.pinnedMessageTimer = setTimeout(async () => {
        try {
          await this.bot.unpinChatMessage(this.channelId, this.pinnedMessageId);
          this.pinnedMessageId = null;
        } catch (error) {
          logError(`Erro ao desfixar mensagem: ${error}`);
        }
      }, 24 * 60 * 60 * 1000);

      await this.sendMessageWithRetry(chatId, '✅ Mensagem fixada com sucesso! Será desfixada automaticamente em 24 horas.');
    } catch (error) {
      logError(`Erro ao fixar mensagem: ${error}`);
      await this.sendMessageWithRetry(chatId, '❌ Erro ao fixar mensagem. Tente novamente.');
    }
  }

  async sendStats(chatId) {
    const uptime = moment.duration(Date.now() - this.startTime).humanize();
    const stats = `📊 *Estatísticas do Bot*\n\n` +
      `🕒 Tempo online: ${uptime}\n` +
      `📨 Mensagens enviadas: ${this.stats.messagesSent}\n` +
      `🎯 Total de operações: ${this.stats.totalOperations}\n` +
      `📈 Operações hoje: ${this.stats.dailyOperations}\n` +
      `⏰ Horário de funcionamento: ${this.customStartHour}:00 - ${this.customEndHour}:00\n` +
      `✅ Status: ${this.isOperating ? 'Em operação' : 'Pausado'}\n` +
      `⚡️ Modo Força: ${this.forceOperating ? 'Ativado' : 'Desativado'}`;

    await this.sendMessageWithRetry(chatId, stats, { parse_mode: 'Markdown' });
  }

  async sendHelp(chatId) {
    const help = `🤖 *Comandos Disponíveis*\n\n` +
      `📌 *Comandos Básicos*\n` +
      `/start - Iniciar o bot\n` +
      `/menu - Mostrar menu principal\n` +
      `/stats - Ver estatísticas\n` +
      `/report - Relatório diário\n` +
      `/morning - Enviar mensagem motivacional\n` +
      `/night - Enviar bênção noturna\n` +
      `/help - Mostrar esta ajuda\n\n` +
      `⚙️ *Funções do Menu*\n` +
      `• Iniciar/Parar operações\n` +
      `• Forçar início/parada\n` +
      `• Enviar comunicados\n` +
      `• Configurar botões\n` +
      `• Fixar mensagens\n` +
      `• Ver estatísticas\n` +
      `• Mensagens motivacionais\n` +
      `• Bênçãos noturnas`;

    await this.sendMessageWithRetry(chatId, help, { parse_mode: 'Markdown' });
  }

  async sendButtonConfig(chatId) {
    const config = `⚙️ *Configuração Atual dos Botões*\n\n` +
      `*Botão 1:*\n` +
      `Texto: ${this.customButtons.button1.text}\n` +
      `Link: ${this.customButtons.button1.url}\n\n` +
      `*Botão 2:*\n` +
      `Texto: ${this.customButtons.button2.text}\n` +
      `Link: ${this.customButtons.button2.url}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '✏️ Editar Botão 1', callback_data: 'edit_button1' }],
        [{ text: '✏️ Editar Botão 2', callback_data: 'edit_button2' }],
        [{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]
      ]
    };

    await this.sendMessageWithRetry(chatId, config, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async sendMorningMotivation() {
    const motivationalMessages = [
      "🌅 *BOM DIA, FAMÍLIA!*\n\n" +
      "🙏 Que hoje seja um dia de vitórias e conquistas!\n" +
      "💪 Mantenha o foco e a disciplina\n" +
      "✨ Sua dedicação será recompensada!",

      "🌞 *COMEÇANDO MAIS UM DIA DE SUCESSO!*\n\n" +
      "🎯 Defina suas metas\n" +
      "📈 Siga sua estratégia\n" +
      "💫 Acredite no seu potencial",

      "🌄 *NOVO DIA, NOVAS OPORTUNIDADES!*\n\n" +
      "⭐️ Sua persistência é sua força\n" +
      "🚀 Vamos em busca dos objetivos\n" +
      "✨ O sucesso é construído dia após dia"
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    await this.sendMessageWithRetry(this.channelId, randomMessage, { parse_mode: 'Markdown' });
  }

  async sendNightBlessing() {
    const blessings = [
      "🌙 *BOA NOITE, FAMÍLIA!*\n\n" +
      "✨ \"O Senhor te abençoe e te guarde.\" - Números 6:24\n\n" +
      "🙏 Que sua noite seja abençoada e seu descanso renovador.",

      "🌠 *MOMENTO DE GRATIDÃO*\n\n" +
      "✝️ \"Em paz me deito e logo pego no sono, porque só tu, Senhor, me fazes viver em segurança.\" - Salmos 4:8\n\n" +
      "🙏 Descanse em paz e renove suas energias.",

      "🌜 *BÊNÇÃO NOTURNA*\n\n" +
      "🙏 \"O Senhor é o meu pastor; nada me faltará.\" - Salmos 23:1\n\n" +
      "✨ Que Deus proteja seu sono e abençoe seu despertar."
    ];

    const randomBlessing = blessings[Math.floor(Math.random() * blessings.length)]; await this.sendMessageWithRetry(this.channelId, randomBlessing, { parse_mode: 'Markdown' });
  }

  async sendDailyReport(chatId) {
    const report = 
      `📈 *RELATÓRIO DIÁRIO*\n\n` +
      `📊 *Estatísticas de Hoje:*\n` +
      `▫️ Operações realizadas: ${this.stats.dailyOperations}\n` +
      `▫️ Mensagens enviadas: ${this.stats.messagesSent}\n\n` +
      `⏰ *Horário de Funcionamento:*\n` +
      `▫️ Início: ${this.customStartHour}:00\n` +
      `▫️ Fim: ${this.customEndHour}:00\n\n` +
      `✅ Status: ${this.isOperating ? 'Em operação' : 'Pausado'}\n` +
      `⚡️ Modo Força: ${this.forceOperating ? 'Ativado' : 'Desativado'}`;

    await this.sendMessageWithRetry(chatId, report, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  startOperations() {
    this.isOperating = true;
    this.scheduleNextOperation();
    logSuccess('Operações iniciadas automaticamente');
  }

  endOperations() {
    this.isOperating = false;
    if (this.operationTimeout) {
      clearTimeout(this.operationTimeout);
      this.operationTimeout = null;
    }
    logSuccess('Operações encerradas automaticamente');
  }
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
