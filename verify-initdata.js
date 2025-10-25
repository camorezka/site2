// verify-initdata.js
const crypto = require('crypto');

function makeDataCheckString(obj) {
  // obj — parsed initDataUnsafe object (примерно)
  // нужно собрать пары key=value, где value сериализуется в JSON для объектов,
  // затем отсортировать по ключу и склеить '\n'
  const pairs = Object.entries(obj).map(([k,v]) => {
    const val = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v);
    return `${k}=${val}`;
  });
  pairs.sort();
  return pairs.join('\n');
}

function verifyInitData(initDataUnsafeObj, initDataHashFromTelegram, botToken) {
  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const dataCheckString = makeDataCheckString(initDataUnsafeObj);
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === initDataHashFromTelegram;
}

module.exports = { verifyInitData };
