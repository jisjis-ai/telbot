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

module.exports = { messageStyles };