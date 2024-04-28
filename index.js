const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const token = '6619909570:AAEQ7exyxb2ipy7K7Qo9H1FimJf3KjIqJqs';
const partyId = '340305';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Merhaba! Nasıl yardımcı olabilirim?');
});

bot.onText(/\/king/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Çağrı Konaçoğlu, oyunun en yüksek yöneticisi ve sembolik figürüdür.');
});

bot.onText(/\/war (\d+)\s+(\d+)/, (msg, match) => {
	const chatId = msg.chat.id;

	const warId = parseInt(match[1]);
	const limit = parseInt(match[2]);

	runTask(warId, limit).then(resp => {
		bot.sendMessage(chatId, 'Limitin, toplam hasar farkı: ' + resp);
	}).catch(err => {
		bot.sendMessage(chatId, 'İşlem sırasında bir hata oluştu.');
	});
});

async function runTask(warId, limit) {
	let result = 0;

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: false
    });

	const devices = puppeteer.KnownDevices;
    const iPhone = devices['iPhone 6'];

    const page = await browser.newPage();
    await page.emulate(iPhone);

    const cookiesString = await fs.readFile('./cookies.json');
    const cookies = JSON.parse(cookiesString);

    await page.setCookie(...cookies);

	let pageNumber = 1;

	while (true) {
		let damages = 0;

		await page.goto('https://m.rivalregions.com/war/damageparties/' + warId + '/' + pageNumber + '/' + partyId);

		const content = await page.content();

		if (!content || !content.includes('<body') || content.includes('<body></body>')) {
			break;
		} else {
			await page.waitForSelector('#list_tbody');

			const users = await page.$$('#list_tbody tr');

			for (const user of users) {
				let id = 'NULL';
				let damage = 'NULL';

				try {
					id = await page.evaluate((el) => el.getAttribute('user'), user);
				} catch (err) { }

				try {
					damage = await page.evaluate((el) => el.querySelector('td.list_level:last-child').getAttribute('rat'), user);
					damage = parseInt(damage);
				} catch (err) { }

				if (id !== 'NULL') {
					damages += damage;
				}
			}
		}

		pageNumber++;

		result = limit - damages;
	}

	await browser.close();

	return result;
}
