// bot.js
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on('message', (ctx) => {
  const msg = ctx.message;
  // Когда веб-приложение вызвало Telegram.WebApp.sendData,
  // бот получает это в msg.web_app_data.data
  if (msg.web_app_data && msg.web_app_data.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      console.log('Получены данные из WebApp:', data);
      // можно переслать себе (если "мне" — ты, владелец бота):
      ctx.telegram.sendMessage(<ТВОЙ_TELEGRAM_ID>, `WebApp от @${ctx.from.username} (id=${ctx.from.id}):\n${JSON.stringify(data)}`);
      // ответим пользователю:
      ctx.reply('Спасибо — данные отправлены владельцу бота.');
    } catch (e) {
      console.error('Ошибка парсинга web_app_data:', e);
    }
  }
});

bot.launch().then(()=>console.log('Bot started'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
