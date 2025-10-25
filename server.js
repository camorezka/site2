// Node.js + Express backend
// Установите: npm install
// Запуск: BOT_TOKEN и YOUR_CHAT_ID задайте в env или прямо в файле (не рекомендую хранить токен прямо в репо)

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // отдает index.html из папки public

// Настройки — замените на свои значения
const BOT_TOKEN = process.env.BOT_TOKEN || '<YOUR_TELEGRAM_BOT_TOKEN>';
const OWNER_CHAT_ID = process.env.YOUR_CHAT_ID || '<YOUR_CHAT_ID>'; // куда шлем уведомления

if (!BOT_TOKEN || BOT_TOKEN.includes('<YOUR_TELEGRAM')) {
  console.warn('WARNING: BOT_TOKEN не задан. Установите env BOT_TOKEN или замените в файле.');
}

// Вспомогательная функция валидации initData по официальному алгоритму
function verifyTelegramInitData(initData) {
  // initData — строка вида "key1=value1\nkey2=value2\n...hash=..."
  // На вход ожидаем объект {initData, hash} или строку initData
  if (!initData) return false;

  // Telegram присылает initData как поле initData (строка параметров) и отдельно initDataUnsafe (parsed)
  // В нашем frontend мы передаём и initData, и initDataUnsafe.user
  // Здесь предположим, что initData — строка вида "key=value&key2=value2..." или "key=value\n..."
  // Но Bot docs говорят: для проверки используйте строку "key=value\nkey2=value2\n..." sorted by key (exclude hash)
  // Мы ожидаем что в запросе приходят: initData (оригинальная строка с hash) и parsed object initDataUnsafe
  return true; // Если вы хотите принудительно валидировать — см. ниже реализацию для query string
}

// Реализация валидатора (по официальной инструкции)
function isValidInitData(rawInitData, botToken) {
  // rawInitData — строка, как пришла от Telegram: "key1=value1&key2=value2&hash=..."
  if (!rawInitData || !botToken) return false;

  // parse into map
  const params = {};
  rawInitData.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) params[k] = decodeURIComponent(v || '');
  });
  const hash = params['hash'];
  if (!hash) return false;
  delete params['hash'];

  // build data_check_string: keys sorted lexicographically, joined "key=value\n"
  const keys = Object.keys(params).sort();
  const data_check_array = keys.map(k => `${k}=${params[k]}`);
  const data_check_string = data_check_array.join('\n');

  // secret_key = SHA256(bot_token)
  const secret_key = crypto.createHash('sha256').update(botToken).digest();

  // compute HMAC-SHA256 of data_check_string with secret_key, then hex -> base16 -> then hex -> compare to hash (hex)
  const hmac = crypto.createHmac('sha256', secret_key).update(data_check_string).digest('hex');

  // Telegram provides hash in hex. Secure-compare:
  const safeEq = crypto.timingSafeEqual(Buffer.from(hmac,'hex'), Buffer.from(hash,'hex'));
  return safeEq;
}

app.post('/opened', async (req, res) => {
  try {
    const { initData, initDataUnsafe } = req.body || {};

    // Обычная защита: если нет initDataUnsafe.user -> отклоняем
    if (!initDataUnsafe || !initDataUnsafe.user) {
      return res.status(400).json({ ok: false, error: 'no initDataUnsafe.user provided' });
    }

    // Проверка подлинности initData (если у вас есть BOT_TOKEN)
    if (BOT_TOKEN && !BOT_TOKEN.includes('<YOUR_TELEGRAM')) {
      const valid = isValidInitData(initData, BOT_TOKEN);
      if (!valid) {
        // В лог и ответ
        console.warn('initData verification failed:', initData);
        // Но всё ещё можно продолжить — в зависимости от политики: здесь отказ
        return res.status(403).json({ ok: false, error: 'initData verification failed' });
      }
    } else {
      console.warn('BOT_TOKEN not configured — skipping verification');
    }

    // берём user
    const user = initDataUnsafe.user;
    const userId = user.id;
    const username = user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const lang = user.language_code || '';
    const msg = `WebApp opened:\nUser ID: ${userId}\nUsername: ${username}\nName: ${user.first_name || ''} ${user.last_name || ''}\nLang: ${lang}\n\nRaw initDataUnsafe: ${JSON.stringify(initDataUnsafe)}`;

    // отправляем вам (владелец) сообщение через Bot API
    const telegramSendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: OWNER_CHAT_ID,
      text: msg
    };

    const r = await fetch(telegramSendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await r.json();

    if (!json.ok) {
      console.warn('Telegram API responded not ok', json);
    }

    return res.json({ ok: true, sent: json.ok, details: json });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening at http://0.0.0.0:${PORT}`);
});
