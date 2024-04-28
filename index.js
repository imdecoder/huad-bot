const TelegramBot = require('node-telegram-bot-api');

const token = '6619909570:AAEQ7exyxb2ipy7K7Qo9H1FimJf3KjIqJqs';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Merhaba, benim adım Telegram Botum! Nasıl yardımcı olabilirim?');
});

bot.onText(/\/king/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Çağrı Konaçoğlu, oyunun en yüksek yöneticisi ve sembolik figürüdür.');
});

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Mesajını aldım!');
});
