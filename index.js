const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

// Configuração do Bot
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY';
const CHANNEL_ID = -1002003497082;

// Ajuste de horários (2 horas atrás para compensar fuso)
const START_HOUR = 6; // 6h no servidor = 8h em Moçambique
const END_HOUR = 17; // 17h no servidor = 19h em Moçambique
const EARLY_MOTIVATION_HOUR = 3; // 3h no servidor = 5h em Moçambique
const NIGHT_BLESSING_HOUR = 18; // 18h no servidor = 20h em Moçambique
const PRE_OPERATION_HOUR = 5; // 5h no servidor = 7h em Moçambique

// Resto das configurações
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

// Estilização de mensagens HTML
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
  constructor(token, channelId) {
    console.log(ASCII_LOGO);
    logSystem('Iniciando sistemas...');
    logSystem('Carregando módulos...');
    logSystem('Estabelecendo conexão com Telegram API...');
    
    this.bot = new TelegramBot(token, { polling: true });
    this.channelId = channelId;
    this.isRunning = true;
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
    if (currentHour >= START_HOUR && currentHour < END_HOUR && !this.isOperating) {
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

    this.bot.onText(/\/stats/, async (msg) => {
      if (await this.isAdmin(msg.chat.id)) {
        await this.sendStats(msg.chat.id);
      }
    });

    this.sendMessageWithRetry(this.channelId, messageStyles.success('Bot iniciado com sucesso!'), { parse_mode: 'HTML' })
      .then(() => logSuccess('Mensagem de teste enviada com sucesso'))
      .catch(error => logError(`Erro ao enviar mensagem de teste: ${error}`));
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
          if (text === ADMIN_USERNAME) {
            await this.sendMessageWithRetry(chatId, messageStyles.info('Digite sua senha:'), { parse_mode: 'HTML' });
            session.step = 'password';
            logInfo(`Tentativa de login: username correto de ${chatId}`);
          } else {
            await this.sendMessageWithRetry(chatId, messageStyles.error('Username incorreto. Tente novamente.\nDigite seu username:'), { parse_mode: 'HTML' });
            logWarning(`Tentativa de login: username incorreto de ${chatId}`);
          }
          break;

        case 'password':
          if (text === ADMIN_PASSWORD) {
            session.step = 'authenticated';
            await this.sendAdminMenu(chatId);
            logSuccess(`Login bem-sucedido: ${chatId}`);
          } else {
            await this.sendMessageWithRetry(chatId, messageStyles.error('Senha incorreta. Acesso negado.'), { parse_mode: 'HTML' });
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
        await this.sendMorningMotivation();
        break;
      case '/night':
        await this.sendNightBlessing();
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

${messageStyles.time(`Horário: ${START_HOUR}:00 - ${END_HOUR}:00`)}
`;

    await this.sendMessageWithRetry(chatId, status, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendSystemInfo(chatId) {
    const uptime = moment.duration(Date.now() - this.stats.systemUptime).humanize();
    const info = `
${messageStyles.title('💻 Informações do Sistema')}

${messageStyles.subtitle('🕒 Uptime:')} ${uptime}
${messageStyles.subtitle('🌐 Timezone:')} ${TIMEZONE}
${messageStyles.subtitle('📡 Versão:')} 2.1
${messageStyles.subtitle('🔄 Última Reinicialização:')} ${moment(this.stats.systemUptime).format('DD/MM/YYYY HH:mm:ss')}

${messageStyles.subtitle('⚙️ Configurações:')}
▫️ Início: ${this.customStartHour}:00
▫️ Término: ${this.customEndHour}:00
▫️ Motivacional: ${EARLY_MOTIVATION_HOUR}:00
▫️ Bênção: ${NIGHT_BLESSING_HOUR}:00`;

    await this.sendMessageWithRetry(chatId, info, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]]
      }
    });
  }

  async sendMaintenanceStats(chatId) {
    const stats = `
${messageStyles.title('🔧 Estatísticas de Manutenção')}

${messageStyles.stats(`📊 Total de Manutenções: ${this.stats.maintenanceCount}`)}
${messageStyles.stats(`🕒 Última Manutenção: ${this.stats.lastMaintenanceDate || 'Nenhuma'}`)}

${messageStyles.subtitle('📈 Status Atual:')}
${this.maintenanceMode ? messageStyles.warning('🔧 Em Manutenção') : messageStyles.success('✅ Sistema Operacional')}`;

    await this.sendMessageWithRetry(chatId, stats, {
      parse_mode: 'HTML',
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

      const message = `
${messageStyles.title('🎯 NOVA OPORTUNIDADE!')}

${messageStyles.subtitle(`⚡️ Multiplicador: ${multiplier}x`)}
${messageStyles.time(`Entrada: ${nextOperationTime}`)}

${messageStyles.warning('⚠️ Saia antes do crash!')}
${messageStyles.success('✅ Faça sua entrada agora!')}`;

      logInfo(`Enviando operação com multiplicador ${multiplier}x`);
      await this.sendMessageWithRetry(this.channelId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      
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
      const message = `
${messageStyles.title('🔄 OPERAÇÃO ENCERRADA')}

${messageStyles.info('📊 Próxima operação em breve!')}`;

      await this.sendMessageWithRetry(this.channelId, message, { parse_mode: 'HTML' });
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

    if ((hour >= START_HOUR && hour < END_HOUR) || this.forceOperating) {
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

    // Early morning motivation
    schedule.scheduleJob(`0 ${EARLY_MOTIVATION_HOUR} * * *`, () => {
      logInfo('Enviando mensagem motivacional da madrugada');
      this.sendEarlyMotivation();
    });

    // Pre-operation notice
    schedule.scheduleJob(`0 ${PRE_OPERATION_HOUR} * * *`, () => {
      logInfo('Enviando aviso de início de operações');
      this.sendPreOperationNotice();
    });

    // Start operations - Modificado para usar uma única regra
    schedule.scheduleJob(`0 ${START_HOUR} * * *`, () => {
      if (!this.maintenanceMode && !this.isOperating) {
        logInfo('Iniciando operações programadas');
        this.startOperations();
      } else {
        logInfo('Operações já em andamento ou sistema em manutenção');
      }
    });

    // End operations
    schedule.scheduleJob(`0 ${END_HOUR} * * *`, () => {
      logInfo('Encerrando operações programadas');
      this.endOperations();
      this.sendEndOperationNotice();
    });

    // Night blessing
    schedule.scheduleJob(`0 ${NIGHT_BLESSING_HOUR} * * *`, () => {
      logInfo('Enviando bênção noturna');
      this.sendNightBlessing();
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
    const shouldBeOperating = currentHour >= START_HOUR && currentHour < END_HOUR;

    // Modificado para evitar inicializações duplicadas
    if (shouldBeOperating && !this.isOperating && !this.maintenanceMode && !this.forceOperating) {
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
    const message = `
${messageStyles.title('🌅 MOTIVAÇÃO DA MADRUGADA')}

${messageStyles.quote('Acordai, vós que dormis, e levantai-vos dentre os mortos, e Cristo vos esclarecerá.')}
${messageStyles.subtitle('Efésios 5:14')}

${messageStyles.info('💫 Um novo dia de oportunidades se inicia!')}
${messageStyles.info('🙏 Que Deus abençoe nossos objetivos')}
${messageStyles.info('✨ Prepare-se para mais um dia vitorioso!')}`;

    await this.sendMessageWithRetry(this.channelId, message, { parse_mode: 'HTML' });
  }

  async sendPreOperationNotice() {
    const message = `
${messageStyles.title('🚨 ATENÇÃO - OPERAÇÕES INICIAM EM 1 HORA')}

${messageStyles.subtitle('📈 Prepare-se para mais um dia de operações!')}

${messageStyles.subtitle('⚠️ AVISOS IMPORTANTES:')}
• Faça seu depósito agora para operar desde o início
• Novatos: Criem suas contas pelo botão abaixo
• Opere na mesma casa que o mentor
• Mesmo gráfico = Maiores chances de sucesso

${messageStyles.subtitle('🎯 HORÁRIO DAS OPERAÇÕES:')}
• Segunda a Sexta: 8h às 19h

${messageStyles.subtitle('👨‍🏫 MENTORIA AO VIVO:')}
• Toda Sexta-feira
• Das 20h às 21h

${messageStyles.success('✅ Clique no botão abaixo para criar sua conta:')}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 CRIAR CONTA AGORA', url: AFFILIATE_URL }],
        [{ text: '💰 FAZER DEPÓSITO', url: AFFILIATE _URL }]
      ]
    };

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  startOperations() {
    if (this.maintenanceMode) {
      logWarning('Tentativa de iniciar operações durante manutenção');
      return;
    }
    
    this.isOperating = true;
    this.scheduleNextOperation();
    
    const message = `
${messageStyles.title('🎯 INÍCIO DAS OPERAÇÕES')}

${messageStyles.subtitle('✅ Sistema ativado e pronto para operar!')}
${messageStyles.info('⏰ Horário: 8h às 19h')}
${messageStyles.success('Boas operações a todos!')}`;

    this.sendMessageWithRetry(this.channelId, message, { parse_mode: 'HTML' });
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

  async sendEndOperationNotice() {
    const message = `
${messageStyles.title('🔔 ENCERRAMENTO DAS OPERAÇÕES')}

${messageStyles.success('✅ Operações encerradas por hoje!')}

${messageStyles.subtitle('📅 PRÓXIMAS ATIVIDADES:')}
• Operações: Amanhã das 8h às 19h
${moment().day() === 5 ? '• Mentoria HOJE às 20h!\n' : '• Mentoria: Sexta-feira às 20h\n'}

${messageStyles.subtitle('⚡️ PREPARAÇÃO PARA AMANHÃ:')}
• Faça seu depósito
• Verifique seu saldo
• Prepare suas estratégias

${messageStyles.success('🎯 Crie sua conta na casa indicada abaixo:')}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 CRIAR CONTA AGORA', url: AFFILIATE_URL }],
        [{ text: '💰 FAZER DEPÓSITO', url: AFFILIATE_URL }]
      ]
    };

    await this.sendMessageWithRetry(this.channelId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendNightBlessing() {
    const message = `
${messageStyles.title('🌙 BÊNÇÃO NOTURNA')}

${messageStyles.quote('O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça; o Senhor volte para ti o seu rosto e te dê paz.')}
${messageStyles.subtitle('Números 6:24-26')}

${messageStyles.info('✨ Que sua noite seja abençoada')}
${messageStyles.info('🙏 Descanse em paz')}
${messageStyles.info('💫 Amanhã será um novo dia de vitórias!')}`;

    await this.sendMessageWithRetry(this.channelId, message, { parse_mode: 'HTML' });
  }

  async handleTempoCommand(msg) {
    try {
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

      const nightBlessing = moment().hour(NIGHT_BLESSING_HOUR).minute(0).second(0);
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
    } catch (error) {
      logError(`Erro ao processar comando /tempo: ${error}`);
      await this.sendMessageWithRetry(msg.chat.id, messageStyles.error('Erro ao processar comando. Tente novamente.'), { parse_mode: 'HTML' });
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
            this.stats.lastMaintenanceDate = moment().format('DD/MM/YYYY HH:mm:ss');
            await this.sendMessageWithRetry(this.channelId, messageStyles.warning('🔧 SISTEMA EM MANUTENÇÃO\n\nOperações temporariamente suspensas.'), { parse_mode: 'HTML' });
            break;

          case 'maintenance_off':
            this.maintenanceMode = false;
            await this.sendMessageWithRetry(this.channelId, messageStyles.success('✅ SISTEMA OPERACIONAL\n\nOperações normalizadas.'), { parse_mode: 'HTML' });
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

          case 'shutdown':
            await this.sendMessageWithRetry(chatId, messageStyles.warning('Desligando o bot...'), { parse_mode: 'HTML' });
            process.exit(0);
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
    return currentHour >= START_HOUR && currentHour < END_HOUR;
  }

  async isAdmin(chatId) {
    const session = this.adminSessions.get(chatId);
    return session && session.step === 'authenticated';
  }
}

// Inicializar o bot
const bot = new OperationsBot(TOKEN, CHANNEL_ID);
