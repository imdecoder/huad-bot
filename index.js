const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const token = '6619909570:AAEQ7exyxb2ipy7K7Qo9H1FimJf3KjIqJqs';

let chatId = null;
let isBotStarted = false;

let warId = null;
let partyId = 340305; // 340305 (HUAD)
let limit = null;
let lastLimit = null;

const bot = new TelegramBot(token, { polling: true });

const allowedUserIds = [6303824081, 579013623]; // Emin, Çağrı

/*bot.on('message', (msg) => {
    const userId = msg.from.id;
    console.log("Kullanıcı ID:", userId);
});*/

bot.onText(/\/start/, (msg) => {
    chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUserIds.includes(parseInt(userId))) {
		isBotStarted = true;
		limitFunction();
        bot.sendMessage(chatId, 'Merhaba! Bana komutlardan birini vererek başlayabilirsin.');
    } else {
        bot.sendMessage(chatId, 'Üzgünüm, botu başlatmak için yetkiniz yok.');
    }
});

bot.onText(/\/king/, (msg) => {
	chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Çağrı Konaçoğlu, oyunun en yüksek yöneticisi ve sembolik figürüdür.');
});

bot.onText(/\/war (.+)/, (msg, match) => {
    if (isBotStarted) {
		chatId = msg.chat.id;
		const userId = msg.from.id;

		bot.getChatMember(chatId, userId)
			.then((chatMember) => {
				if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
					const link = match[1];
					const matchResult = link.match(/\/(\d+)$/);
					const id = matchResult ? matchResult[1] : null;

					warId = id;

					bot.sendMessage(chatId, 'Order tanımlandı.');
				} else {
					bot.sendMessage(chatId, 'Üzgünüm, bu komutu çalıştırmak için yetkiniz yok.');
				}
			})
			.catch((error) => {
				console.error("Hata:", error);
				bot.sendMessage(chatId, 'Komutu çalıştırırken bir hata oluştu.');
			});
	}
});

bot.onText(/\/limit (.+)/, (msg, match) => {
    if (isBotStarted) {
		chatId = msg.chat.id;
		const userId = msg.from.id;

		bot.getChatMember(chatId, userId)
			.then((chatMember) => {
				if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
					const limitText = match[1];
					const limitValue = parseLimit(limitText);

					if (limitValue !== null) {
						limit = limitValue;
						bot.sendMessage(chatId, 'Limit tanımlandı. Bol şans!');
					} else {
						bot.sendMessage(chatId, 'Geçersiz limit, lütfen doğru bir limit girin.\n(Örn: 5kkk)');
					}
				} else {
					bot.sendMessage(chatId, 'Üzgünüm, bu komutu çalıştırmak için yetkiniz yok.');
				}
			})
			.catch((error) => {
				console.error("Hata:", error);
				bot.sendMessage(chatId, 'Komutu çalıştırırken bir hata oluştu.');
			});
	}
});

bot.onText(/\/info/, (msg) => {
	if (isBotStarted) {
		chatId = msg.chat.id;

		if (warId !== null && limit !== null) {
			runTask().then((res) => {
				if (lastLimit <= 0) {
					bot.sendMessage(chatId, 'Order limiti doldu.');
				} else {
					bot.sendMessage(chatId, 'Toplam limit: ' + formatNumberWithDots(limit) + '\nKalan limit: ' + formatNumberWithDots(lastLimit));
				}
			}).catch((err) => {
				bot.sendMessage(chatId, 'İşlem sırasında bir hata oluştu ve bilgi getirilemedi.');
			});
		} else {
			bot.sendMessage(chatId, 'Hata! Savaş veya limit değeri tanımlanmamış.');
		}
	}
});

function formatNumberWithDots(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseLimit(limitText) {
	limitText = limitText.toLowerCase();

	const limitWithoutK = limitText.replace(/k/g, '000');
	const limitNumber = parseFloat(limitWithoutK);

	return isNaN(limitNumber) ? null : limitNumber;
}

async function runTask() {
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
	let damages = 0;

	while (true) {
		await page.goto('https://m.rivalregions.com/war/damageparties/' + warId + '/' + pageNumber + '/' + partyId);

		const content = await page.content();

		if (!content || !content.includes('<body') || content.includes('<body></body>')) {
			break;
		} else {
			await page.waitForSelector('#list_tbody');

			const users = await page.$$('#list_tbody tr');

			for (const user of users) {
				let id = null;
				let damage = null;

				try {
					id = await page.evaluate((el) => el.getAttribute('user'), user);
				} catch (err) { }

				try {
					damage = await page.evaluate((el) => el.querySelector('td.list_level:last-child').getAttribute('rat'), user);
					damage = parseInt(damage);
				} catch (err) { }

				if (id !== null) {
					damages += damage;
				}
			}
		}

		pageNumber++;
	}

	lastLimit = limit - damages;

	await browser.close();
}

async function limitFunction() {
	let stopped = false;

	while (true) {
		if (stopped && ((limit !== null && lastLimit !== null) && (lastLimit >= 0))) {
			runTask().then((res) => {
				if (lastLimit > 0) {
					bot.sendMessage(chatId, 'Toplam limit: ' + formatNumberWithDots(limit) + '\nKalan limit: ' + formatNumberWithDots(lastLimit));
				}
			});

			stopped = false;
		} else {
			stopped = true;
		}

		await wait(10 * 60 * 1000);
	}
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
