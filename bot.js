# bot.js
const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('start', (ctx) => {
    ctx.reply('Welcome to Hora Calculator! 🙏\n\nI can help you find auspicious times based on Hora calculations.');
});

bot.command('today', (ctx) => {
    const date = new Date();
    ctx.reply(`Today's Date: ${date.toLocaleDateString()}\nFetching Hora calculations...`);
});

bot.command('premium', (ctx) => {
    ctx.reply(
        '✨ Premium Features:\n\n' +
        '• Daily Hora notifications\n' +
        '• Personalized auspicious times\n' +
        '• Detailed interpretations\n' +
        '• Priority support'
    );
});

bot.command('help', (ctx) => {
    ctx.reply(
        'Available commands:\n\n' +
        '/today - Get current hora\n' +
        '/premium - View premium features\n' +
        '/help - Show this message'
    );
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));