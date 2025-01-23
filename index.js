const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

// Bot configuration
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY';
const CHANNEL_ID = -1002003497082;
const START_HOUR = 8;
const END_HOUR = 19;
const EARLY_MOTIVATION_HOUR = 5;
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

class OperationsBot {
  constructor(token, channelId) {
    console.log(ASCII_LOGO);
    logSystem('Iniciando sistemas...');
    logSystem('Carregando módulos...');
    logSystem('Estabelecendo conexão com Telegram API...');
    
    this.bot = new TelegramBot(token, { polling: true });
    this.channelId = channelId;
    this.isOperating = false;
    this.maintenanceMode = false;
    this.stats = {
      totalOperations: 0,
      messagesSent: 0,
      dailyOperations: 0,
      maintenanceCount: 0,
      lastMaintenanceDate: null,
      systemUptime: Date.now()
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

    // Adicionar novo comando
    this.bot.onText(/\/tempo/, (msg) => this.handleTempoCommand(msg));

    // Iniciar operações automaticamente se estiver dentro do horário
    const currentHour = moment().hour();
    if (currentHour >= START_HOUR && currentHour < END_HOUR) {
      this.startOperations();
    }

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

  async handleTempoCommand(msg) {
    const chatId = msg.chat.id;
    const now = moment();
    
    // Calcular tempos restantes
    const nextOperation = moment().hour(START_HOUR).minute(0).second(0);
    if (now.isAfter(nextOperation)) {
      nextOperation.add(1, 'day');
    }

    const nextMotivation = moment().hour(EARLY_MOTIVATION_HOUR).minute(0).second(0);
    if (now.isAfter(nextMotivation)) {
      nextMotivation.add(1, 'day');
    }

    const operationsEnd = moment().hour(END_HOUR).minute(0).second(0);
    if (now.isAfter(operationsEnd)) {
      operationsEnd.add(1, 'day');
    }

    const nightBlessing = moment().hour(20).minute(0).second(0);
    if (now.isAfter(nightBlessing)) {
      nightBlessing.add(1, 'day');
    }

    const message = 
      "⏰ *TEMPOS RESTANTES*\n\n" +
      `🌅 Motivação: ${moment.duration(nextMotivation.diff(now)).format("HH:mm:ss")}\n` +
      `🎯 Operações: ${moment.duration(nextOperation.diff(now)).format("HH:mm:ss")}\n` +
      `🔚 Fim Operações: ${moment.duration(operationsEnd.diff(now)).format("HH:mm:ss")}\n` +
      `🌙 Bênção Noturna: ${moment.duration(nightBlessing.diff(now)).format("HH:mm:ss")}`;

    await this.sendMessageWithRetry(chatId, message, { parse_mode: 'Markdown' });
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
          if (msg.photo || msg.video || msg.document) {
            session.mediaType = msg.photo ? 'photo' : msg.video ? 'video' : 'document';
            session.mediaId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : 
                           msg.video ? msg.video.file_id : 
                           msg.document.file_id;
            await this.sendMessageWithRetry(chatId, 'Agora digite o texto do comunicado:', { reply_markup: { force_reply: true } });
            session.step = 'waiting_announcement_text';
          } else {
            session.announcementText = msg.text;
            await this.sendMessageWithRetry(chatId, 'Digite o texto para o primeiro botão:', { reply_markup: { force_reply: true } });
            session.step = 'waiting_button1_text';
          }
          break;

        case 'waiting_announcement_text':
          session.announcementText = msg.text;
          await this.sendMessageWithRetry(chatId, 'Digite o texto para o primeiro botão:', { reply_markup: { force_reply: true } });
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
          { text: '🔧 Ativar Manutenção', callback_data: 'maintenance_on' },
          { text: '✅ Desativar Manutenção', callback_data: 'maintenance_off' }
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
          { text: '🌅 Motivação Madrugada', callback_data: 'send_early_motivation' },
          { text: '🌙 Bênção Noturna', callback_data: 'send_night_blessing' }
        ],
        [
          { text: '💻 Info Sistema', callback_data: 'system_info' },
          { text: '🔧 Stats Manutenção', callback_data: 'maintenance_stats' }
        ]
      ]
    };

    const status = 
      `🤖 *Painel de Controle v2.1*\n\n` +
      `📊 *Status Atual:*\n` +
      `${this.maintenanceMode ? '🔧 Em Manutenção' : '✅ Operacional'}\n` +
      `${this.isOperating ? '▶️ Operando' : '⏹️ Pausado'}\n` +
      `${this.forceOperating ? '⚡️ Modo Força Ativo' : '🔒 Modo Normal'}\n\n` +
      `⏰ Horário: ${this.customStartHour}:00 - ${this.customEndHour}:00`;

    await this.sendMessageWithRetry(chatId, status, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async sendSystemInfo(chatId) {
    const uptime = moment.duration(Date.now() - this.stats.systemUptime).humanize();
    const info = 
      `💻 *Informações do Sistema*\n\n` +
      `🕒 Uptime: ${uptime}\n` +
      `🌐 Timezone: ${TIMEZONE}\n` +
      `📡 Versão: 2.1\n` +
      `🔄 Última Reinicialização: ${moment(this.stats.systemUptime).format('DD/MM/YYYY HH:mm:ss')}\n\n` +
      `⚙️ *Configurações:*\n` +
      `▫️ Início: ${this.customStartHour}:00\n` +
      `▫️ Término: ${this.customEndHour}:00\n` +
      `▫️ Motivacional: 05:00\n` +
      `▫️ Bênção: 20:00`;

    await this.sendMessageWithRetry(chatId, info, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendMaintenanceStats(chatId) {
    const stats = 
      `🔧 *Estatísticas de Manutenção*\n\n` +
      `📊 Total de Manutenções: ${this.stats.maintenanceCount}\n` +
      `🕒 Última Manutenção: ${this.stats.lastMaintenanceDate || 'Nenhuma'}\n\n` +
      `📈 *Status Atual:*\n` +
      `${this.maintenanceMode ? '🔧 Em Manutenção' : '✅ Sistema Operacional'}`;

    await this.sendMessageWithRetry(chatId, stats, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendOperation() {
    if (!this.isOperating || this.maintenanceMode) return;

    try {
      console.log(ASCII_OPERATION);
      const multiplier = (Math.random() * (6.99 - 1.00) + 1.00).toFixed(2);
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
    if (!this.isOperating || this.maintenanceMode) return;

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

  setupSchedules() {
    logSystem('Configurando agendamentos...');
    
    // Reset daily stats at midnight
    schedule.scheduleJob('0 0 * * *', () => {
      this.stats.dailyOperations = 0;
      logInfo('Contador de operações diárias resetado');
    });

    // Early morning motivation at 5 AM sharp
    schedule.scheduleJob('0 5 * * *', () => {
      logInfo('Enviando mensagem motivacional da madrugada');
      this.sendEarlyMotivation();
    });

    // Pre-operation notification at 7 AM
    schedule.scheduleJob('0 7 * * *', () => {
      logInfo('Enviando aviso de início de operações');
      this.sendPreOperationNotice();
    });

    // Start operations exactly at 8 AM
    schedule.scheduleJob('0 8 * * *', () => {
      if (!this.maintenanceMode) {
        logInfo('Iniciando operações programadas');
        this.startOperations();
      }
    });

    // End operations exactly at 7 PM
    schedule.scheduleJob('0 19 * * *', () => {
      logInfo('Encerrando operações programadas');
      this.endOperations();
      this.sendEndOperationNotice();
    });

    // Night blessing at 8 PM
    schedule.scheduleJob('0 20 * * *', () => {
      logInfo('Enviando bênção noturna');
      this.sendNightBlessing();
    });

    // System health check every hour
    schedule.scheduleJob('0 * * * *', () => {
      this.performHealthCheck();
    });

    logSuccess('Agendamentos configurados com sucesso');
  }

  async sendPreOperationNotice() {
    const message = 
      "🚨 *ATENÇÃO - OPERAÇÕES INICIAM EM 1 HORA*\n\n" +
      "📈 Prepare-se para mais um dia de operações!\n\n" +
      "⚠️ *AVISOS IMPORTANTES:*\n" +
      "• Faça seu depósito agora para operar desde o início\n" +
      "• Novatos: Criem suas contas pelo botão abaixo\n" +
      "• Opere na mesma casa que o mentor\n" +
      "• Mesmo gráfico = Maiores chances de sucesso\n\n" +
      "🎯 *HORÁRIO DAS OPERAÇÕES:*\n" +
      "• Segunda a Sexta: 8h às 19h\n\n" +
      "👨‍🏫 *MENTORIA AO VIVO:*\n" +
      "• Toda Sexta-feira\n" +
      "• Das 20h às 21h\n\n" +
      "✅ Clique no botão abaixo para criar sua conta:";

    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 CRIAR CONTA AGORA', url: AFFILIATE_URL }],
        [{ text: '💰 FAZER DEPÓSITO', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async sendEndOperationNotice() {
    const message = 
      "🔔 *ENCERRAMENTO DAS OPERAÇÕES*\n\n" +
      "✅ Operações encerradas por hoje!\n\n" +
      "📅 *PRÓXIMAS ATIVIDADES:*\n" +
      "• Operações: Amanhã das 8h às 19h\n" +
      `${moment().day() === 5 ? "• Mentoria HOJE às 20h!\n" : "• Mentoria: Sexta-feira às 20h\n"}\n` +
      "⚡️ *PREPARAÇÃO PARA AMANHÃ:*\n" +
      "• Faça seu depósito\n" +
      "• Verifique seu saldo\n" +
      "• Prepare suas estratégias\n\n" +
      "🎯 Crie sua conta na casa indicada abaixo:";

    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 CRIAR CONTA AGORA', url: AFFILIATE_URL }],
        [{ text: '💰 FAZER DEPÓSITO', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async performHealthCheck() {
    const uptime = moment.duration(Date.now() - this.stats.systemUptime).humanize();
    const currentHour = moment().hour();
    const shouldBeOperating = currentHour >= START_HOUR && currentHour < END_HOUR;

    if (shouldBeOperating && !this.isOperating && !this.maintenanceMode) {
      logWarning('Sistema detectou inconsistência no estado de operação');
      this.startOperations();
    }

    if (!shouldBeOperating && this.isOperating && !this.forceOperating) {
      logWarning('Sistema detectou operações fora do horário');
      this.endOperations();
    }

    logInfo(`Verificação de saúde do sistema - Uptime: ${uptime}`);
  }

  async sendEarlyMotivation() {
    const messages = [
      "🌅 *MOTIVAÇÃO DA MADRUGADA*\n\n" +
      "\"Acordai, vós que dormis, e levantai-vos dentre os mortos, e Cristo vos esclarecerá.\" - Efésios 5:14\n\n" +
      "💫 Um novo dia de oportunidades se inicia!\n" +
      "🙏 Que Deus abençoe nossos objetivos\n" +
      "✨ Prepare-se para mais um dia vitorioso!",

      "🌄 *DESPERTAR VITORIOSO*\n\n" +
      "\"O Senhor é a minha força e o meu escudo.\" - Salmos 28:7\n\n" +
      "🌟 A madrugada traz novas possibilidades\n" +
      "💪 Sua dedicação será recompensada\n" +
      "✨ Vamos juntos em busca das conquistas!",

      "🌅 *BENÇÃO MATINAL*\n\n" +
      "\"As misericórdias do Senhor se renovam a cada manhã.\" - Lamentações 3:23\n\n" +
      "🙏 Que este dia seja repleto de vitórias\n" +
      "💫 Sua persistência é sua maior força\n" +
      "✨ Deus está no controle de tudo!",

      "🌅 *AMAN HECER ABENÇOADO*\n\n" +
      "\"Tudo posso naquele que me fortalece.\" - Filipenses 4:13\n\n" +
      "🙏 Deus está contigo nesta madrugada\n" +
      "💫 Seu potencial é ilimitado\n" +
      "✨ Hoje será um dia de vitórias!",

      "🌄 *DESPERTAR COM DEUS*\n\n" +
      "\"Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.\" - Salmos 37:5\n\n" +
      "🌟 Sua dedicação será recompensada\n" +
      "💪 Mantenha sua fé inabalável\n" +
      "✨ Grandes conquistas te aguardam!",

      "🌅 *MANHÃ DE VITÓRIAS*\n\n" +
      "\"Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor.\" - Jeremias 29:11\n\n" +
      "🙏 Deus tem um propósito especial para você\n" +
      "💫 Sua persistência é admirável\n" +
      "✨ Continue firme em seus objetivos!",

      "🌄 *AURORA DE BÊNÇÃOS*\n\n" +
      "\"O Senhor é minha luz e minha salvação; de quem terei temor?\" - Salmos 27:1\n\n" +
      "🌟 Comece o dia com determinação\n" +
      "💪 Sua força vem do Senhor\n" +
      "✨ Vitórias te aguardam!",

      "🌅 *DESPERTAR COM FÉ*\n\n" +
      "\"Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados.\" - Deuteronômio 31:6\n\n" +
      "🙏 Deus está no controle\n" +
      "💫 Sua dedicação será recompensada\n" +
      "✨ Hoje é dia de conquistas!",

      "🌄 *AMANHECER DE PROPÓSITOS*\n\n" +
      "\"Antes que te formasse no ventre te conheci.\" - Jeremias 1:5\n\n" +
      "🌟 Você tem um propósito especial\n" +
      "💪 Deus planejou cada detalhe\n" +
      "✨ Siga em frente com fé!",

      "🌅 *MANHÃ DE ESPERANÇA*\n\n" +
      "🙏 Confie no tempo de Deus\n" +
      "💫 Seus sonhos são possíveis\n" +
      "✨ Mantenha sua fé viva!"
    ];

    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'Markdown'
    });
  }

  async sendNightBlessing() {
    const message = 
      "🌙 *BÊNÇÃO NOTURNA*\n\n" +
      "\"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça; o Senhor volte para ti o seu rosto e te dê paz.\" - Números 6:24-26\n\n" +
      "✨ Que sua noite seja abençoada\n" +
      "🙏 Descanse em paz\n" +
      "💫 Amanhã será um novo dia de vitórias!";

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'Markdown'
    });
  }

  startOperations() {
    if (this.maintenanceMode) {
      logWarning('Tentativa de iniciar operações durante manutenção');
      return;
    }

    this.isOperating = true;
    this.scheduleNextOperation();
    logSuccess('Operações iniciadas');
  }

  endOperations() {
    this.isOperating = false;
    if (this.operationTimeout) {
      clearTimeout(this.operationTimeout);
      this.operationTimeout = null;
    }
    logInfo('Operações encerradas');
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
            this.stats.lastMaintenanceDate = moment().format('DD/MM/YYYY HH:mm:ss');
            await this.sendMessageWithRetry(this.channelId, '🔧 *SISTEMA EM MANUTENÇÃO*\n\nOperações temporariamente suspensas.', { parse_mode: 'Markdown' });
            break;

          case 'maintenance_off':
            this.maintenanceMode = false;
            await this.sendMessageWithRetry(this.channelId, '✅ *SISTEMA OPERACIONAL*\n\nOperações normalizadas.', { parse_mode: 'Markdown' });
            break;

          case 'force_start':
            this.forceOperating = true;
            this.startOperations();
            break;

          case 'force_stop':
            this.forceOperating = false;
            if (!this.isInOperatingHours()) {
              this.endOperations();
            }
            break;

          case 'send_announcement':
            session.step = 'waiting_announcement';
            await this.sendMessageWithRetry(chatId, 'Digite o texto do comunicado ou envie uma mídia (foto/vídeo/documento):', { reply_markup: { force_reply: true } });
            break;

          case 'config_buttons':
            session.step = 'waiting_button1_text';
            await this.sendMessageWithRetry(chatId, 'Digite o texto para o primeiro botão:', { reply_markup: { force_reply: true } });
            break;

          case 'pin_message':
            session.step = 'waiting_pin_message';
            await this.sendMessageWithRetry(chatId, 'Digite a mensagem que deseja fixar:', { reply_markup: { force_reply: true } });
            break;

          case 'view_stats':
            await this.sendStats(chatId);
            break;

          case 'send_early_motivation':
            await this.sendEarlyMotivation();
            break;

          case 'send_night_blessing':
            await this.sendNightBlessing();
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
    return currentHour >= this.customStartHour && currentHour < this.customEndHour;
  }

  async sendAnnouncement(chatId, session) {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: session.button1Text, url: session.button1Url }],
          [{ text: session.button2Text, url: session.button2Url }]
        ]
      };

      if (session.mediaId) {
        switch (session.mediaType) {
          case 'photo':
            await this.bot.sendPhoto(this.channelId, session.mediaId, {
              caption: session.announcementText,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
            break;
          case 'video':
            await this.bot.sendVideo(this.channelId, session.mediaId, {
              caption: session.announcementText,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
            break;
          case 'document':
            await this.bot.sendDocument(this.channelId, session.mediaId, {
              caption: session.announcementText,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
            break;
        }
      } else {
        await this.sendMessageWithRetry(this.channelId, session.announcementText, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }

      await this.sendMessageWithRetry(chatId, '✅ Comunicado enviado com sucesso!');
      await this.sendAdminMenu(chatId);
    } catch (error) {
      logError(`Erro ao enviar comunicado: ${error}`);
      await this.sendMessageWithRetry(chatId, '❌ Erro ao enviar comunicado. Tente novamente.');
      await this.sendAdminMenu(chatId);
    }
  }

  async sendStats(chatId) {
    const uptime = moment.duration(Date.now() - this.startTime).humanize();
    const stats = 
      `📊 *Estatísticas do Sistema*\n\n` +
      `🔢 Total de Operações: ${this.stats.totalOperations}\n` +
      `📈 Operações Hoje: ${this.stats.dailyOperations}\n` +
      `📨 Mensagens Enviadas: ${this.stats.messagesSent}\n` +
      `⏱️ Uptime: ${uptime}\n\n` +
      `🕒 Última Atualização: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

    await this.sendMessageWithRetry(chatId, stats, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendHelp(chatId) {
    const help = 
      `ℹ️ *Comandos Disponíveis*\n\n` +
      `🔹 /menu - Mostra o menu principal\n` +
      `🔹 /stats - Mostra estatísticas do sistema\n` +
      `🔹 /report - Gera relatório diário\n` +
      `🔹 /morning - Envia mensagem motivacional\n` +
      `🔹 /night - Envia bênção noturna\n` +
      `🔹 /tempo - Mostra tempos restantes\n` +
      `🔹 /help - Mostra esta mensagem`;

    await this.sendMessageWithRetry(chatId, help, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendDailyReport(chatId) {
    const report = 
      `📋 *Relatório Diário*\n\n` +
      `📊 Operações Realizadas: ${this.stats.dailyOperations}\n` +
      `📈 Taxa de Sucesso: ${((this.stats.dailyOperations / this.stats.totalOperations) * 100).toFixed(2)}%\n` +
      `⏱️ Tempo em Operação: ${moment.duration(Date.now() - this.startTime).humanize()}\n\n` +
      `📅 Data: ${moment().format('DD/MM/YYYY')}\n` +
      `🕒 Hora: ${moment().format('HH:mm:ss')}`;

    await this.sendMessageWithRetry(chatId, report, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }
}

// Initialize the bot
const bot = new OperationsBot(TOKEN, CHANNEL_ID);
