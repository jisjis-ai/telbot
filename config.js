// Channel configurations
const channels = {
  VENCEDOR: {
    id: -1002358907501,
    name: 'Vencedor',
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

// Bot configuration
const config = {
  TOKEN: '5847731188:AAF2vTmLyBHvdBYY4LSgJYQFqdbBL5IrSMY',
  ADMIN_USERNAME: '007',
  ADMIN_PASSWORD: '006007',
  TIMEZONE: 'Africa/Maputo',
  START_HOUR: 8,
  END_HOUR: 19,
  EARLY_MOTIVATION_HOUR: 5,
  NIGHT_BLESSING_HOUR: 20,
  PRE_OPERATION_HOUR: 7
};

module.exports = { channels, config };
