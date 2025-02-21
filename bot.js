const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();
console.log('Bot is starting...');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Keep track of users who want notifications
const notificationUsers = new Set();

// Planet definitions with both languages
const planets = {
    surya: { 
        name: 'சூரியன்', 
        english: 'Sun (Suryan)',
        tamilDescription: 'அரசு அதிகாரிகளை சந்திக்க, பதவி ஏற்க உகந்த நேரம்',
        englishDescription: 'Auspicious time for meeting officials and taking up positions'
    },
    sukra: { 
        name: 'சுக்ரன்', 
        english: 'Venus (Sukran)',
        tamilDescription: 'கலை, அழகு சார்ந்த செயல்களுக்கு உகந்த நேரம்',
        englishDescription: 'Auspicious time for arts and beauty-related activities'
    },
    budha: { 
        name: 'புதன்', 
        english: 'Mercury (Budhan)',
        tamilDescription: 'கல்வி, வியாபாரம் செய்ய உகந்த நேரம்',
        englishDescription: 'Auspicious time for education and business'
    },
    chandra: { 
        name: 'சந்திரன்', 
        english: 'Moon (Chandran)',
        tamilDescription: 'பயணம், புதிய முயற்சிகளுக்கு உகந்த நேரம்',
        englishDescription: 'Auspicious time for travel and new ventures'
    },
    sani: { 
        name: 'சனி', 
        english: 'Saturn (Sani)',
        tamilDescription: 'பழைய பொருட்களை அகற்ற உகந்த நேரம்',
        englishDescription: 'Auspicious time for removing old things'
    },
    guru: { 
        name: 'குரு', 
        english: 'Jupiter (Guru)',
        tamilDescription: 'ஆன்மீக செயல்களுக்கு உகந்த நேரம்',
        englishDescription: 'Auspicious time for spiritual activities'
    },
    cevvai: { 
        name: 'செவ்வாய்', 
        english: 'Mars (Sevvai)',
        tamilDescription: 'வீரம் சார்ந்த செயல்களுக்கு உகந்த நேரம்',
        englishDescription: 'Auspicious time for brave ventures'
    }
};

// Planet sequences for each day
const planetSequences = {
    0: ['surya', 'sukra', 'budha', 'chandra', 'sani', 'guru', 'cevvai'], // Sunday
    1: ['chandra', 'sani', 'guru', 'cevvai', 'surya', 'sukra', 'budha'], // Monday
    2: ['cevvai', 'surya', 'sukra', 'budha', 'chandra', 'sani', 'guru'], // Tuesday
    3: ['budha', 'chandra', 'sani', 'guru', 'cevvai', 'surya', 'sukra'], // Wednesday
    4: ['guru', 'cevvai', 'surya', 'sukra', 'budha', 'chandra', 'sani'], // Thursday
    5: ['sukra', 'budha', 'chandra', 'sani', 'guru', 'cevvai', 'surya'], // Friday
    6: ['sani', 'guru', 'cevvai', 'surya', 'sukra', 'budha', 'chandra']  // Saturday
};

// Sub-Horai sequences
const ubaHoraiSequences = {
    surya: ['surya', 'chandra', 'cevvai', 'budha', 'guru'],
    sukra: ['sukra', 'sani', 'surya', 'chandra', 'cevvai'],
    budha: ['budha', 'guru', 'sukra', 'sani', 'surya'],
    chandra: ['chandra', 'cevvai', 'budha', 'guru', 'sukra'],
    sani: ['sani', 'surya', 'chandra', 'cevvai', 'budha'],
    guru: ['guru', 'sukra', 'sani', 'surya', 'chandra'],
    cevvai: ['cevvai', 'budha', 'guru', 'sukra', 'sani']
};

// Utility functions
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const hour24 = hours.toString().padStart(2, '0');
    const min = minutes.toString().padStart(2, '0');
    
    return {
        standard: `${hour12}:${min} ${ampm}`,
        railway: `${hour24}:${min}`
    };
}

function getTimeRange(date) {
    const hours = date.getHours();
    const startHour = hours;
    const endHour = (hours + 1) % 24;
    
    const formatHour = (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${ampm}`;
    };
    
    return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

function getCurrentHorai(date) {
    const dayOfWeek = date.getDay();
    const hours = date.getHours();
    const adjustedHour = (hours + 18) % 24;
    const sequence = planetSequences[dayOfWeek];
    return sequence[Math.floor(adjustedHour / 1) % 7];
}

function getCurrentSubHorai(mainHorai, minutes) {
    const subIndex = Math.floor((minutes % 60) / 12);
    return ubaHoraiSequences[mainHorai][subIndex];
}// Keyboard and notification functions
function getMainKeyboard() {
    return Markup.keyboard([
        ['🕒 Current Hora', '📅 Daily Schedule'],
        ['🔔 Notifications', '❓ Help']
    ]).resize();
}

let notificationInterval;

function startNotifications(ctx) {
    if (!notificationInterval) {
        notificationInterval = setInterval(() => {
            const now = new Date();
            const minutes = now.getMinutes();
            
            // Send notification at the start of each hora (every hour)
            if (minutes === 0) {
                notificationUsers.forEach(userId => {
                    sendHoraNotification(userId);
                });
            }
            
            // Send notification at each sub-hora change (every 12 minutes)
            if (minutes % 12 === 0) {
                notificationUsers.forEach(userId => {
                    sendSubHoraNotification(userId);
                });
            }
        }, 60000); // Check every minute
    }
}

function sendHoraNotification(userId) {
    const now = new Date();
    const currentHorai = getCurrentHorai(now);
    const message = 
        `⏰ Hora Change Alert!\n\n` +
        `New Hora: ${planets[currentHorai].name} (${planets[currentHorai].english})\n` +
        `Benefits: ${planets[currentHorai].englishDescription}`;
    
    bot.telegram.sendMessage(userId, message);
}

function sendSubHoraNotification(userId) {
    const now = new Date();
    const currentHorai = getCurrentHorai(now);
    const currentSubHorai = getCurrentSubHorai(currentHorai, now.getMinutes());
    const message = 
        `⏰ Sub-Hora Change Alert!\n\n` +
        `New Sub-Hora: ${planets[currentSubHorai].name} (${planets[currentSubHorai].english})`;
    
    bot.telegram.sendMessage(userId, message);
}

function getDailySchedule(date) {
    const dayOfWeek = date.getDay();
    const sequence = planetSequences[dayOfWeek];
    let schedule = '';

    for (let hour = 0; hour < 24; hour++) {
        const adjustedHour = (hour + 18) % 24;
        const planetKey = sequence[Math.floor(adjustedHour / 1) % 7];
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0);
        const times = formatTime(startTime);
        
        schedule += `${times.standard} - ${planets[planetKey].name} (${planets[planetKey].english})\n`;
        if (hour === 11) {
            schedule += '\n--- Night Hours ---\n\n';
        }
    }

    return schedule;
}

// Bot commands and handlers
bot.command('start', (ctx) => {
    const message = 
        `🙏 Welcome to Hora Calculator\n\n` +
        `Use the keyboard below to access features:`;

    ctx.reply(message, getMainKeyboard());
});

bot.hears('🕒 Current Hora', (ctx) => {
    const now = new Date();
    const currentHorai = getCurrentHorai(now);
    const currentSubHorai = getCurrentSubHorai(currentHorai, now.getMinutes());
    const times = formatTime(now);
    const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });

    const message = 
        `🕒 Hora Calculator | ஹோரை கணிப்பு\n\n` +
        `📅 Date: ${dateStr}\n` +
        `⏰ Time: ${times.standard} (${times.railway})\n` +
        `🔄 Current Range: ${getTimeRange(now)}\n\n` +
        `Main Hora | முக்கிய ஹோரை:\n` +
        `• ${planets[currentHorai].name} (${planets[currentHorai].english})\n\n` +
        `Sub Hora | உப ஹோரை:\n` +
        `• ${planets[currentSubHorai].name} (${planets[currentSubHorai].english})\n\n` +
        `Benefits | பலன்கள்:\n` +
        `Tamil: ${planets[currentHorai].tamilDescription}\n` +
        `English: ${planets[currentHorai].englishDescription}\n\n` +
        `🌐 For detailed calculations visit:\n` +
        `https://horaicalculator.vercel.app/`;

    ctx.reply(message);
});

bot.hears('📅 Daily Schedule', (ctx) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });

    const schedule = getDailySchedule(now);
    const message = 
        `📅 Daily Hora Schedule\n` +
        `Date: ${dateStr}\n\n` +
        `${schedule}\n\n` +
        `🌐 For more details visit:\n` +
        `https://horaicalculator.vercel.app/`;

    ctx.reply(message);
});

bot.hears('🔔 Notifications', (ctx) => {
    const userId = ctx.from.id;
    const isSubscribed = notificationUsers.has(userId);
    
    if (isSubscribed) {
        notificationUsers.delete(userId);
        ctx.reply('✖️ Notifications disabled');
    } else {
        notificationUsers.add(userId);
        startNotifications(ctx);
        ctx.reply('✔️ Notifications enabled! You will receive alerts for:\n\n' +
                 '• Hora changes (hourly)\n' +
                 '• Sub-Hora changes (every 12 minutes)');
    }
});

bot.hears('❓ Help', (ctx) => {
    const message = 
        `📖 Help | உதவி\n\n` +
        `Available Features:\n` +
        `• Current Hora - View current hora details\n` +
        `• Daily Schedule - View full day schedule\n` +
        `• Notifications - Get hora change alerts\n` +
        `• Help - Show this help message\n\n` +
        `🌐 For detailed calculations visit:\n` +
        `https://horaicalculator.vercel.app/`;

    ctx.reply(message);
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('Sorry, something went wrong. Please try again.');
});

// Launch bot
bot.launch()
    .then(() => {
        console.log('Bot successfully launched!');
        startNotifications();
    })
    .catch((err) => {
        console.error('Failed to launch bot:', err);
    });

// Enable graceful stop
process.once('SIGINT', () => {
    clearInterval(notificationInterval);
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    clearInterval(notificationInterval);
    bot.stop('SIGTERM');
});