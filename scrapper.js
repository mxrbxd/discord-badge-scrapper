console.log(`
███╗   ███╗ ██████╗ ██████╗ ██████╗ ██╗██████╗ 
████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║██╔══██╗
██╔████╔██║██║   ██║██████╔╝██████╔╝██║██║  ██║
██║╚██╔╝██║██║   ██║██╔══██╗██╔══██╗██║██║  ██║
██║ ╚═╝ ██║╚██████╔╝██║  ██║██████╔╝██║██████╔╝
╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝╚═════╝                                       
`);

const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const chalk = require('chalk');

const TOKEN = '';
const SERVER_IDS = ['']; // Birden fazla server ID ekleyebilirsiniz.
const WEBHOOK_URL = '';

const BADGE_EMOJIS = { 
    'EARLY_SUPPORTER': '<:early:1444057098089533761>',
    'EARLY_VERIFIED_BOT_DEVELOPER': '<:developer:1444057028132737186>',
    'HYPESQUAD_EVENTS': '<:hypesquad:1444057004468338699>',
    'BUGHUNTER_LEVEL_1': '<:bughunter1:1444056794409205880>',
    'BUGHUNTER_LEVEL_2': '<:bughunter2:1444056922407047269>',
    'DISCORD_CERTIFIED_MODERATOR': '<:mod:1445616768008585349>',
    'PARTNERED_SERVER_OWNER': '<:partner:1445621933541429308>',
};

const client = new Client({
    checkUpdate: false
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.username}`);
    
    let allMessages = [];
    let processedUsers = new Set();

    const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];

    const batchSize = 10;
    const allResults = [];

    for (let i = 0; i < SERVER_IDS.length; i += batchSize) {
        const batch = SERVER_IDS.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (serverId, batchIndex) => {
            const index = i + batchIndex;
            const guild = client.guilds.cache.get(serverId);
            
            if (!guild) {
                console.error(`Sunucu bulunamadı: ${serverId}`);
                return [];
            }

            const color = colors[index % colors.length];
            console.log(color(`[${index + 1}/${SERVER_IDS.length}] ${guild.name} taranıyor...`));

            try {
                await guild.members.fetch({ limit: 1000 });
            } catch (err) {
                console.error(`${guild.name}: Üyeler çekilemedi`);
                return [];
            }

            const vanityUrl = guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : null;
            const guildMessages = [];

            for (const member of guild.members.cache.values()) {
                if (member.user.bot) continue;
                if (processedUsers.has(member.user.id)) continue;

                const flags = member.user.flags?.toArray() || [];
                const trackedFlags = flags.filter(f => BADGE_EMOJIS[f]);
                
                if (trackedFlags.length === 0) continue;
                
                const allBadges = trackedFlags.map(f => BADGE_EMOJIS[f] || f).join(' - ');
                const vanityText = vanityUrl ? ` - [**Sunucu**](https://${vanityUrl})` : '';
                
                const message = `**${member.user.id}** - <@${member.user.id}> - ${allBadges}${vanityText}`;
                guildMessages.push(message);
                processedUsers.add(member.user.id);
            }

            console.log(chalk.green(`✓ ${guild.name}: ${guildMessages.length} rozetli kullanıcı`));
            return guildMessages;
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);

        if (i + batchSize < SERVER_IDS.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    allMessages = allResults.flat();

    if (allMessages.length === 0) {
        console.log('Rozetli kullanıcı bulunamadı.');
        process.exit(0);
    }

    let currentChunk = '';
    let chunks = [];
    
    for (const msg of allMessages) {
        if ((currentChunk + msg + '\n').length > 4000) {
            chunks.push(currentChunk);
            currentChunk = msg + '\n';
        } else {
            currentChunk += msg + '\n';
        }
    }
    if (currentChunk) chunks.push(currentChunk);

    console.log(chalk.cyan(`📤 ${chunks.length} embed gönderiliyor...`));

    for (let i = 0; i < chunks.length; i += 5) {
        const batch = chunks.slice(i, i + 5);
        const batchPromises = batch.map(async (chunk, batchIndex) => {
            try {
                const embed = {
                    title: 'Morbid Scrapper',
                    description: chunk,
                    color: 0x5865F2,
                    footer: {
                        text: '@anonimface'
                    }
                };
                await axios.post(WEBHOOK_URL, { embeds: [embed] });
                console.log(chalk.green(`✓ Embed gönderildi (${i + batchIndex + 1}/${chunks.length})`));
            } catch (err) {
                console.error(chalk.red('✗ Webhook hatası:'), err.response?.data || err.message);
            }
        });
        
        await Promise.all(batchPromises);
        
        if (i + 5 < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`Toplam ${allMessages.length} rozetli kullanıcı gönderildi.`);
    process.exit(0);
});

client.login(TOKEN);
