// Importação de bibliotecas necessárias
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment');

// Configuração do bot
const TOKEN = '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY'; // Insira seu token do bot
const CHANNEL_ID = -1002003497082; // Substitua pelo ID do seu canal
const ADMIN_USERNAME = '007'; // Nome de usuário do admin
const ADMIN_PASSWORD = '006007'; // Senha do admin
const AFFILIATE_URL = 'https://media1.placard.co.mz/redirect.aspx?pid=2197&bid=1690'; // Link de afiliado

// Configurações de operação
const START_HOUR = 8; // Horário de início das operações (8h em Moçambique)
const END_HOUR = 19; // Horário de término das operações (19h em Moçambique)
const TIMEZONE_OFFSET = 2; // Diferença de fuso horário do servidor para Moçambique

// Inicialização do bot e variáveis globais
class OperationsBot {
  constructor(token, channelId) {
    this.bot = new TelegramBot(token, { polling: true });
    this.channelId = channelId;
    this.isOperating = false;
    this.stats = {
      totalOperations: 0,
      greenOperations: 0,
      messagesSent: 0,
    };
    this.adminSessions = new Map();
    this.operationTimeout = null;

    this.bot.on('error', (error) => console.error('Erro no bot:', error));
    this.bot.on('polling_error', (error) => console.error('Erro de polling:', error));

    console.log('Bot iniciado com sucesso!');
    this.setupCommands();
    this.setupSchedules();
  }

  // Função para obter o horário de Moçambique
  getMozambiqueTime() {
    const now = moment();
    now.add(TIMEZONE_OFFSET, 'hours'); // Ajuste para o fuso horário
    return now;
  }

  // Verifica se está dentro do horário de operação
  isWithinOperatingHours() {
    const now = this.getMozambiqueTime();
    return now.hours() >= START_HOUR && now.hours() < END_HOUR;
  }

  // Configuração dos comandos e interação com o admin
  setupCommands() {
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || '';
      const session = this.adminSessions.get(chatId) || { step: 'start' };

      if (text.startsWith('/')) {
        await this.handleAdminCommand(chatId, text);
        return;
      }

      switch (session.step) {
        case 'start':
          await this.bot.sendMessage(chatId, 'Bem-vindo ao painel admin! Digite seu username:');
          session.step = 'username';
          break;

        case 'username':
          if (text === ADMIN_USERNAME) {
            await this.bot.sendMessage(chatId, 'Digite sua senha:');
            session.step = 'password';
          } else {
            await this.bot.sendMessage(chatId, 'Username incorreto. Tente novamente.');
          }
          break;

        case 'password':
          if (text === ADMIN_PASSWORD) {
            session.step = 'authenticated';
            await this.sendAdminMenu(chatId);
          } else {
            await this.bot.sendMessage(chatId, 'Senha incorreta. Tente novamente.');
            session.step = 'start';
          }
          break;

        default:
          break;
      }

      this.adminSessions.set(chatId, session);
    });
  }

  // Gerencia comandos administrativos
  async handleAdminCommand(chatId, command) {
    const session = this.adminSessions.get(chatId);

    if (!session || session.step !== 'authenticated') {
      await this.bot.sendMessage(chatId, 'Você precisa estar autenticado para usar comandos.');
      return;
    }

    switch (command) {
      case '/stats':
        await this.sendStats(chatId);
        break;
      case '/start':
        this.isOperating = true;
        await this.bot.sendMessage(chatId, 'Operações iniciadas.');
        this.scheduleNextOperation();
        break;
      case '/stop':
        this.isOperating = false;
        clearTimeout(this.operationTimeout);
        await this.bot.sendMessage(chatId, 'Operações pausadas.');
        break;
      default:
        await this.bot.sendMessage(chatId, 'Comando não reconhecido.');
    }
  }

  // Envia estatísticas para o admin
  async sendStats(chatId) {
    const stats = `
📊 Estatísticas:
- Total de operações: ${this.stats.totalOperations}
- Operações green: ${this.stats.greenOperations}
- Mensagens enviadas: ${this.stats.messagesSent}
`;
    await this.bot.sendMessage(chatId, stats);
  }

  // Envia o menu administrativo
  async sendAdminMenu(chatId) {
    const menu = `
Comandos disponíveis:
/stats - Ver estatísticas
/start - Iniciar operações
/stop - Parar operações
    `;
    await this.bot.sendMessage(chatId, menu);
  }

  // Agendamento de início e término automáticos
  setupSchedules() {
    schedule.scheduleJob('0 8 * * *', () => this.startOperations()); // Início às 8h
    schedule.scheduleJob('0 19 * * *', () => this.endOperations());  // Término às 19h
  }

  // Inicia operações no horário certo
  async startOperations() {
    if (!this.isWithinOperatingHours()) return;

    this.isOperating = true;
    await this.bot.sendMessage(
      this.channelId,
      '🎮 Operações iniciadas! Vamos lucrar!'
    );
    this.scheduleNextOperation();
  }

  // Finaliza operações no horário certo
  async endOperations() {
    this.isOperating = false;
    clearTimeout(this.operationTimeout);
    await this.bot.sendMessage(
      this.channelId,
      '🔚 Operações encerradas. Retornamos amanhã às 8h!'
    );
  }

  // Planeja a próxima operação
  scheduleNextOperation() {
    if (!this.isOperating || !this.isWithinOperatingHours()) return;

    const waitTime = Math.floor(Math.random() * (10 - 3 + 1) + 3) * 60000; // Intervalo aleatório entre 3-10 minutos
    this.operationTimeout = setTimeout(() => {
      this.executeOperation();
      this.scheduleNextOperation();
    }, waitTime);
  }

  // Executa uma operação
  async executeOperation() {
    if (!this.isOperating || !this.isWithinOperatingHours()) return;

    this.stats.totalOperations++;
    await this.bot.sendMessage(
      this.channelId,
      '🎯 Nova operação realizada. Vamos lucrar!'
    );
  }
}

// Inicializa o bot
new OperationsBot(TOKEN, CHANNEL_ID);}
