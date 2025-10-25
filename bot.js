const { Telegraf } = require('telegraf');
const bot = new Telegraf('ТОКЕН_ТВОЕГО_БОТА');

bot.start((ctx) => {
  ctx.reply('Открой Mini App:', {
    reply_markup: {
      keyboard: [
        [
          {
            text: '🚀 Открыть мини-приложение',
            web_app: { url: 'https://site2-sepia-ten.vercel.app/' }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

bot.on('message', (ctx) => {
  const msg = ctx.message;
  if (msg.web_app_data?.data) {
    const data = JSON.parse(msg.web_app_data.data);
    ctx.reply('✅ Данные отправлены!');
    bot.telegram.sendMessage(
      '767154085',
      `📩 WebApp от @${ctx.from.username} (id=${ctx.from.id})\n\n` +
        JSON.stringify(data, null, 2)
    );
  }
});

bot.launch();
