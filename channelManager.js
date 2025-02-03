const moment = require('moment-timezone');
const { messageStyles } = require('./styles');

class ChannelManager {
  constructor(bot, channel) {
    this.bot = bot;
    this.channel = channel;
    this.stats = {
      totalOperations: 0,
      messagesSent: 0,
      dailyOperations: 0
    };
    this.operationTimeout = null;
    this.isOperating = false;
  }

  async sendOperation() {
    if (!this.isOperating) return;

    try {
     const multiplier = (Math.random() * (6.99 - 1.00) + 1.00).toFixed(2);
const nextOperationTime = moment().tz("Africa/Maputo").add(3, 'minutes').format('HH:mm');

      const message = `
${messageStyles.title(`🎯 NOVA OPORTUNIDADE ${this.channel.name.toUpperCase()}`)}

${messageStyles.subtitle(`⚡️ Multiplicador: ${multiplier}x`)}
${messageStyles.time(`Entrada: ${nextOperationTime}`)}

${messageStyles.warning('⚠️ Saia antes do crash!')}
${messageStyles.success('✅ Faça sua entrada agora!')}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎯 APOSTAR AGORA', url: this.channel.affiliateUrl }],
          [{ text: '📝 CRIAR CONTA', url: this.channel.affiliateUrl }]
        ]
      };

      await this.bot.sendMessage(this.channel.id, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      this.stats.messagesSent++;
      this.stats.totalOperations++;
      this.stats.dailyOperations++;

      setTimeout(() => this.sendResult(), 3 * 60 * 1000);
    } catch (error) {
      console.error(`[${this.channel.name}] Erro ao enviar operação:`, error);
      this.scheduleNextOperation();
    }
  }

  async sendResult() {
    try {
      const message = `
${messageStyles.title('🔄 OPERAÇÃO ENCERRADA')}

${messageStyles.info('📊 Próxima operação em breve!')}`;

      await this.bot.sendMessage(this.channel.id, message, { parse_mode: 'HTML' });
      this.scheduleNextOperation();
    } catch (error) {
      console.error(`[${this.channel.name}] Erro ao enviar resultado:`, error);
      this.scheduleNextOperation();
    }
  }

  scheduleNextOperation() {
    if (!this.isOperating) return;

    const delay = Math.floor(Math.random() * (180000 - 60000) + 60000); // 1-3 minutes
    this.operationTimeout = setTimeout(() => this.sendOperation(), delay);
  }

  startOperations() {
    this.isOperating = true;
    this.scheduleNextOperation();
    
    const message = `
${messageStyles.title(`🎯 INÍCIO DAS OPERAÇÕES ${this.channel.name.toUpperCase()}`)}

${messageStyles.subtitle('✅ Sistema ativado e pronto para operar!')}
${messageStyles.info('⏰ Horário: 8h às 19h')}
${messageStyles.success('Boas operações a todos!')}`;

    this.bot.sendMessage(this.channel.id, message, { parse_mode: 'HTML' });
  }

  stopOperations() {
    this.isOperating = false;
    if (this.operationTimeout) {
      clearTimeout(this.operationTimeout);
      this.operationTimeout = null;
    }
  }

  async sendMotivationalMessage() {
    const message = `
${messageStyles.title(`🌅 BOM DIA ${this.channel.name.toUpperCase()}`)}

${messageStyles.quote('Acordai, vós que dormis, e levantai-vos dentre os mortos, e Cristo vos esclarecerá.')}
${messageStyles.subtitle('Efésios 5:14')}

${messageStyles.info('💫 Um novo dia de oportunidades se inicia!')}
${messageStyles.info('🙏 Que Deus abençoe nossos objetivos')}
${messageStyles.info('✨ Prepare-se para mais um dia vitorioso!')}`;

    await this.bot.sendMessage(this.channel.id, message, { parse_mode: 'HTML' });
  }

  getStats() {
    return {
      channelName: this.channel.name,
      ...this.stats,
      isOperating: this.isOperating
    };
  }
}

module.exports = ChannelManager;
