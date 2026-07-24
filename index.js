/**
 * ============================================================================
 * AURAMC ENTERPRISE NETWORK ENGINE - v5.0 [ULTRA-PRO-MAX BUILD]
 * ============================================================================
 * Architecture: Discord.js v14 Enterprise Core
 * Features: High-End Telemetry, Autonomous Economy, RPG Marketplace with Auto-Role,
 * Advanced Blackjack & Slots Casino, Global Leveling, and Administrative Core.
 */

const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  Events,
  PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
require('dotenv').config();

// ================= EXPRESS WEB SERVER (24/7 CLOUD UPTIME) =================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send(`
  <html>
    <head><title>AuraMC Engine v5.0</title></head>
    <body style="background:#121212;color:#00ffcc;font-family:monospace;text-align:center;padding-top:50px;">
      <h1>[AURAMC CORE ENGINE v5.0]</h1>
      <p>Status: ONLINE // Node Cluster Operational</p>
    </body>
  </html>
`));
app.listen(PORT, () => console.log(`[INFRASTRUCTURE] Express server online on port ${PORT}`));

// ================= DISCORD CLIENT INITIALIZATION =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ================= IN-MEMORY STORAGE DATABASES =================
const userEconomy = new Map();
const userInventory = new Map();
const userXp = new Map();
const serverSettings = new Map();
const cooldowns = new Map();

const configPath = path.join(__dirname, 'server-config.json');

// ================= ECONOMY & RPG SHOP CATALOG =================
const shopItems = [
  { id: 'vip_rank', name: 'VIP Status', price: 1000000, desc: 'Exclusive VIP Role on the server with high-tier perks', emoji: '💎' },
  { id: 'custom_sword', name: 'AuraMC Mythic Blade', price: 15000, desc: 'A legendary weapon forged for elite network warriors', emoji: '⚔️' },
  { id: 'lootbox', name: 'Cipher Mystery Box', price: 5000, desc: 'Decrypt for random high-value digital currency & items', emoji: '🎁' },
  { id: 'shield', name: 'Firewall Shield', price: 10000, desc: 'Advanced defensive matrix to block 1 incoming network robbery', emoji: '🛡️' }
];

// ================= ULTRA-PRO HELPER SUBSYSTEMS =================
function getEco(userId) {
  if (!userEconomy.has(userId)) userEconomy.set(userId, { wallet: 1000, bank: 5000 });
  return userEconomy.get(userId);
}

function getInv(userId) {
  if (!userInventory.has(userId)) userInventory.set(userId, []);
  return userInventory.get(userId);
}

function getXp(userId) {
  if (!userXp.has(userId)) userXp.set(userId, { xp: 0, level: 1 });
  return userXp.get(userId);
}

function checkMinecraftServer(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    let start = Date.now();
    socket.on('connect', () => { 
      let ping = Date.now() - start;
      socket.destroy(); 
      resolve({ online: true, ping }); 
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ online: false, ping: 0 }); });
    socket.on('error', () => { socket.destroy(); resolve({ online: false, ping: 0 }); });
    socket.connect(port, host);
  });
}

function generateProgressBar(current, max, length = 15) {
  const progress = Math.min(Math.round((current / max) * length), length);
  const empty = length - progress;
  return `**[**${'█'.repeat(progress)}${'░'.repeat(empty)}**]**`;
}

function getBaseEmbed(interaction = null, color = '#2b2d31') {
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  if (interaction && client.user) {
    embed.setFooter({ text: 'AuraMC Enterprise Protocol // Core v5.0', iconURL: client.user.displayAvatarURL() });
  }
  return embed;
}

function checkCooldown(userId, commandName, delayInMs) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();
  if (cooldowns.has(key)) {
    const expiration = cooldowns.get(key) + delayInMs;
    if (now < expiration) return expiration;
  }
  cooldowns.set(key, now);
  return null;
}

// ================= BLACKJACK ENGINE MATRIX =================
const deckTemplate = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card)) return 10;
  if (card === 'A') return 11;
  return parseInt(card);
}
function calculateHand(hand) {
  let val = 0;
  let aces = 0;
  for (let card of hand) {
    val += getCardValue(card);
    if (card === 'A') aces++;
  }
  while (val > 21 && aces > 0) {
    val -= 10;
    aces--;
  }
  return val;
}

// ================= COMMAND MANIFEST (22 PROTOCOLS) =================
const commands = [
  new SlashCommandBuilder().setName('help').setDescription('Access the Ultra-Pro interactive command manual'),
  new SlashCommandBuilder().setName('server').setDescription('Fetch live diagnostics of the primary AuraMC game cluster'),
  new SlashCommandBuilder().setName('setup-server').setDescription('Bind a remote Minecraft address to telemetry nodes (Admin)'),
  new SlashCommandBuilder().setName('autostatus').setDescription('Designate this channel for live 24/7 telemetry feeds (Admin)'),
  new SlashCommandBuilder().setName('botinfo').setDescription('Inspect core engine performance and host hardware metrics'),
  new SlashCommandBuilder().setName('suggest').setDescription('Transmit a community proposal to the developers').addStringOption(o => o.setName('idea').setDescription('Your suggestion text').setRequired(true)),

  new SlashCommandBuilder().setName('balance').setDescription('Examine your financial portfolio assets').addUserOption(o => o.setName('user').setDescription('Target user profile').setRequired(false)),
  new SlashCommandBuilder().setName('deposit').setDescription('Secure funds into your banking vault').addIntegerOption(o => o.setName('amount').setDescription('Amount to transfer').setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Extract funds from your banking vault').addIntegerOption(o => o.setName('amount').setDescription('Amount to withdraw').setRequired(true)),
  new SlashCommandBuilder().setName('daily').setDescription('Collect your daily capital stipend'),
  new SlashCommandBuilder().setName('weekly').setDescription('Collect your massive weekly high-tier stipend'),
  new SlashCommandBuilder().setName('work').setDescription('Perform cybersecurity and engineering tasks for income'),
  new SlashCommandBuilder().setName('pay').setDescription('Wire transfer funds to another network user').addUserOption(o => o.setName('user').setDescription('Recipient user').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount to transfer').setRequired(true)),
  new SlashCommandBuilder().setName('rob').setDescription('Initiate a high-risk security breach on a user wallet').addUserOption(o => o.setName('target').setDescription('Target profile').setRequired(true)),
  new SlashCommandBuilder().setName('give').setDescription('Inject system currency into a user wallet (Admin Only)').addUserOption(o => o.setName('user').setDescription('Recipient user').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount to inject').setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the Top 10 richest tycoons on the network'),

  new SlashCommandBuilder().setName('shop').setDescription('Browse the AuraMC secure black-market catalog'),
  new SlashCommandBuilder().setName('buy').setDescription('Purchase elite items or VIP status').addStringOption(o => o.setName('item_id').setDescription('Target item identifier').setRequired(true)),
  new SlashCommandBuilder().setName('inventory').setDescription('Inspect your personal secured digital asset vault'),

  new SlashCommandBuilder().setName('slots').setDescription('Wager currency on the automated casino slot machine').addIntegerOption(o => o.setName('bet').setDescription('Wager amount').setRequired(true)),
  new SlashCommandBuilder().setName('blackjack').setDescription('Engage in high-stakes 21 against the digital croupier').addIntegerOption(o => o.setName('bet').setDescription('Wager amount').setRequired(true)),

  new SlashCommandBuilder().setName('rank').setDescription('Check your global network clearance level and XP status').addUserOption(o => o.setName('user').setDescription('Target user profile').setRequired(false))
].map(cmd => cmd.toJSON());

// ================= SYSTEM BOOT & TELEMETRY DAEMON =================
client.once(Events.ClientReady, async () => {
  console.log(`[SYSTEM BOOT] Engine v5.0 active as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[REGISTRY] Successfully synced 22 Enterprise Slash Commands.');
  } catch (error) {
    console.error('[CRITICAL ERROR] Failed to sync commands:', error);
  }

  // --- Real-time Auto Status Background Loop ---
  setInterval(async () => {
    if (!fs.existsSync(configPath)) return;
    try {
      const config = JSON.parse(fs.readFileSync(configPath));
      const status = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

      const embed = new EmbedBuilder()
        .setColor(status.online ? '#57F287' : '#ED4245')
        .setTitle('🌐 AURAMC LIVE ENTERPRISE TELEMETRY')
        .setDescription(`>>> **Cluster Status:** ${status.online ? '🟢 **ONLINE & FULLY STABLE**' : '🔴 **CRITICAL // OFFLINE**'}\n*Automated background health pulse active.*`)
        .addFields(
          { name: '📥 Bound Endpoint', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
          { name: '⚡ Latency Response', value: `\`${status.online ? status.ping + 'ms' : 'Timeout'}\``, inline: true },
          { name: '🔄 Last Pulse Check', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'AuraMC Telemetry Daemon', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      for (const [guildId, settings] of serverSettings.entries()) {
        if (settings.statusChannelId) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const channel = guild.channels.cache.get(settings.statusChannelId);
            if (channel) {
              const messages = await channel.messages.fetch({ limit: 3 }).catch(() => null);
              if (messages) await channel.bulkDelete(messages).catch(() => {});
              await channel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error('[TELEMETRY LOOP ERROR]', err);
    }
  }, 5 * 60 * 1000);
});

// ================= AUTONOMOUS XP ENGINE =================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  const cd = checkCooldown(message.author.id, 'xp_gain', 60000);
  if (!cd) {
    const xpData = getXp(message.author.id);
    const xpGained = Math.floor(Math.random() * 12) + 15;
    xpData.xp += xpGained;

    const nextLevelXp = xpData.level * 160;
    if (xpData.xp >= nextLevelXp) {
      xpData.level++;
      xpData.xp -= nextLevelXp;
      
      const embed = getBaseEmbed(null, '#F1C40F')
        .setTitle('🆙 NETWORK CLEARANCE UPGRADE')
        .setDescription(`>>> Outstanding performance, ${message.author}. Your authorization matrix has been elevated.\n\n**New Security Clearance:** \`Level ${xpData.level}\``)
        .setThumbnail(message.author.displayAvatarURL());
      
      await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
});

// ================= ULTRA-PRO INTERACTION HANDLER =================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, user } = interaction;
  
  try {
    // --------------------------------------------------------
    // HELP SYSTEM PROTOCOL
    // --------------------------------------------------------
    if (commandName === 'help') {
      const embed = getBaseEmbed(interaction, '#00ffcc')
        .setTitle('🛡️ AURAMC ENTERPRISE - INTERACTIVE MANUAL')
        .setDescription('>>> Welcome to the high-performance command reference directory. All systems operate on isolated secure threads.')
        .addFields(
          { name: '🌐 Minecraft & Infrastructure', value: '`/server` - Live game server cluster diagnostics\n`/setup-server` - Securely bind target node IP/Port\n`/autostatus` - Deploy autonomous telemetry feed\n`/botinfo` - Check host hardware & resource usage\n`/suggest` - Transmit proposals with rating feeds', inline: false },
          { name: '💳 Autonomous Economy Matrix', value: '`/balance` - View liquid & vaulted asset sheets\n`/deposit` & `/withdraw` - Bank vault management\n`/daily` / `/weekly` - Claim stipends\n`/work` - Execute network engineering contracts\n`/pay` - Secure wire transfers\n`/rob` - Unauthorized vault breach attempt\n`/give` - Admin capital injection protocol\n`/leaderboard` - Forbes top asset holders', inline: false },
          { name: '🛒 Black-Market RPG Shop', value: '`/shop` - Browse elite inventory catalog (VIP Status: `$1,000,000`)\n`/buy` - Procure assets (Auto-assigns Discord role for VIP!)\n`/inventory` - Inspect personal storage container', inline: false },
          { name: '🎰 High-Stakes Casino', value: '`/slots` - Spin automated reels for payouts\n`/blackjack` - Interactive tactical 21 card game', inline: false },
          { name: '🎖️ Clearance & Social', value: '`/rank` - Inspect global user clearance level and XP bar', inline: false }
        )
        .setThumbnail(client.user.displayAvatarURL());
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --------------------------------------------------------
    // SERVER & TELEMETRY PROTOCOLS
    // --------------------------------------------------------
    else if (commandName === 'server') {
      await interaction.deferReply();
      if (!fs.existsSync(configPath)) {
        return interaction.editReply({ embeds: [getBaseEmbed(interaction, '#ED4245').setTitle('⚠️ Configuration Fault').setDescription('>>> Telemetry endpoint unassigned. Execute **`/setup-server`** first.')] });
      }
      const config = JSON.parse(fs.readFileSync(configPath));
      const status = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

      const embed = getBaseEmbed(interaction, status.online ? '#57F287' : '#ED4245')
        .setTitle('🌐 AURAMC GAME NODE STATUS')
        .setThumbnail(guild.iconURL() || client.user.displayAvatarURL())
        .setDescription(`>>> **Node Status:** ${status.online ? '🟢 **ONLINE & RESPONSIVE**' : '🔴 **OFFLINE // UNREACHABLE**'}\n*${config.description || 'Welcome to AuraMC Network!'}*`)
        .addFields(
          { name: '📥 Target Address', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
          { name: '⚡ Roundtrip Ping', value: `\`${status.online ? status.ping + 'ms' : 'Connection Refused'}\``, inline: true },
          { name: '🛡️ Encapsulation', value: '`TCP v4 Enterprise`', inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'setup-server' || commandName === 'autostatus') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Access Denied: Administrator security clearance required.', ephemeral: true });
      }
      
      if (commandName === 'setup-server') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('open_setup_modal').setLabel('Launch Configuration Terminal').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
        );
        await interaction.reply({ embeds: [getBaseEmbed(interaction, '#3498DB').setTitle('🛠️ CONFIGURATION PORTAL').setDescription('>>> Click below to initialize setup parameters via secure interactive modal.')], components: [row], ephemeral: true });
      } else {
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).statusChannelId = channel.id;
        await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🔄 TELEMETRY FEED BOUND').setDescription(`>>> Live updates will now stream into ${channel} every 5 minutes.`)], ephemeral: true });
      }
    }

    else if (commandName === 'botinfo') {
      const core = os.cpus()[0];
      const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const uptime = `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`;
      
      const embed = getBaseEmbed(interaction, '#3498DB')
        .setTitle('🤖 ENTERPRISE HARDWARE DIAGNOSTICS')
        .setDescription('>>> Real-time telemetry monitoring core container performance.')
        .addFields(
          { name: '🧠 Host Processor', value: `\`\`\`yaml\n${core.model}\`\`\``, inline: false },
          { name: '💾 Heap Allocation', value: `\`${ramUsed} MB\` / \`${totalRam} GB\``, inline: true },
          { name: '📡 Gateway Latency', value: `\`${client.ws.ping}ms\``, inline: true },
          { name: '🕒 Continuous Uptime', value: uptime, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL());
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'suggest') {
      const idea = options.getString('idea');
      const embed = getBaseEmbed(interaction, '#9B59B6')
        .setAuthor({ name: `${user.username}'s Proposal Matrix`, iconURL: user.displayAvatarURL() })
        .setTitle('💡 NEW COMMUNITY PROPOSAL')
        .setDescription(`>>> ${idea}`);
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('upvote').setLabel('0').setStyle(ButtonStyle.Success).setEmoji('👍'),
        new ButtonBuilder().setCustomId('downvote').setLabel('0').setStyle(ButtonStyle.Danger).setEmoji('👎')
      );
      
      const msg = await channel.send({ embeds: [embed], components: [row] });
      await msg.startThread({ name: `Discussion: ${user.username}'s Proposal`, autoArchiveDuration: 1440 });
      await interaction.reply({ content: 'Proposal successfully transmitted to the review grid.', ephemeral: true });
    }

    // --------------------------------------------------------
    // LEVELING PROTOCOL
    // --------------------------------------------------------
    else if (commandName === 'rank') {
      const target = options.getUser('user') || user;
      const data = getXp(target.id);
      const nextXp = data.level * 160;
      const embed = getBaseEmbed(interaction, '#9B59B6')
        .setAuthor({ name: `Clearance Profile: ${target.username}`, iconURL: target.displayAvatarURL() })
        .setDescription('>>> Global network authorization status.')
        .addFields(
          { name: '🎖️ Clearance Tier', value: `\`\`\`css\nLevel ${data.level}\`\`\``, inline: true },
          { name: '⚡ Accumulated XP', value: `\`\`\`css\n${data.xp} / ${nextXp} XP\`\`\``, inline: true },
          { name: '🚀 Progress Matrix', value: generateProgressBar(data.xp, nextXp), inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }

    // --------------------------------------------------------
    // ECONOMY & ADMIN GIVE PROTOCOLS
    // --------------------------------------------------------
    else if (commandName === 'balance') {
      const target = options.getUser('user') || user;
      const eco = getEco(target.id);
      const embed = getBaseEmbed(interaction, '#57F287')
        .setAuthor({ name: `${target.username}'s Financial Portfolio`, iconURL: target.displayAvatarURL() })
        .addFields(
          { name: '👛 Wallet (Liquid Assets)', value: `\`\`\`cs\n$ ${eco.wallet.toLocaleString()}\`\`\``, inline: true },
          { name: '🏦 Bank (Vault Storage)', value: `\`\`\`cs\n$ ${eco.bank.toLocaleString()}\`\`\``, inline: true },
          { name: '📊 Combined Net Worth', value: `\`$ ${(eco.wallet + eco.bank).toLocaleString()}\``, inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'deposit') {
      const amount = options.getInteger('amount');
      const eco = getEco(user.id);
      if (amount <= 0 || eco.wallet < amount) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Transaction Aborted: Insufficient liquid wallet funds.')], ephemeral: true });
      eco.wallet -= amount;
      eco.bank += amount;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🏦 VAULT DEPOSIT SUCCESSFUL').setDescription(`>>> Securely transferred **$ ${amount.toLocaleString()}** into the central vault.\n**Updated Vault Balance:** \`$ ${eco.bank.toLocaleString()}\``)] });
    }

    else if (commandName === 'withdraw') {
      const amount = options.getInteger('amount');
      const eco = getEco(user.id);
      if (amount <= 0 || eco.bank < amount) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Transaction Aborted: Insufficient vault funds.')], ephemeral: true });
      eco.bank -= amount;
      eco.wallet += amount;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🏦 VAULT WITHDRAWAL SUCCESSFUL').setDescription(`>>> Successfully extracted **$ ${amount.toLocaleString()}** to wallet.\n**Updated Wallet Balance:** \`$ ${eco.wallet.toLocaleString()}\``)] });
    }

    else if (commandName === 'daily' || commandName === 'weekly') {
      const isDaily = commandName === 'daily';
      const delay = isDaily ? 86400000 : 604800000;
      const cd = checkCooldown(user.id, commandName, delay);
      
      if (cd) {
        return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription(`>>> ⏳ Security Lock Active: Stipend available for collection <t:${Math.floor(cd / 1000)}:R>.`)], ephemeral: true });
      }
      const eco = getEco(user.id);
      const reward = isDaily ? 2500 : 15000;
      eco.wallet += reward;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#FEE75C').setTitle(isDaily ? '🎁 DAILY STIPEND DISBURSED' : '🎁 WEEKLY STIPEND DISBURSED').setDescription(`>>> Collected **$ ${reward.toLocaleString()}**.\n**Updated Wallet:** \`$ ${eco.wallet.toLocaleString()}\``)] });
    }

    else if (commandName === 'work') {
      const cd = checkCooldown(user.id, 'work', 3600000);
      if (cd) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription(`>>> ⏳ Cooling down. Next engineering shift available <t:${Math.floor(cd / 1000)}:R>.`)], ephemeral: true });
      
      const eco = getEco(user.id);
      const wage = Math.floor(Math.random() * 1200) + 400;
      const jobs = ['patched a critical zero-day exploit', 'mined a rich vein of Netherite debris', 'configured a distributed BungeeCord cluster', 'compiled a high-performance Java plugin'];
      eco.wallet += wage;
      
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('💼 SHIFT COMPLETED').setDescription(`>>> You ${jobs[Math.floor(Math.random() * jobs.length)]} and earned **$ ${wage.toLocaleString()}**.\n**Wallet Balance:** \`$ ${eco.wallet.toLocaleString()}\``)] });
    }

    else if (commandName === 'give') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Access Denied: Administrator clearance required.', ephemeral: true });
      }
      const target = options.getUser('user');
      const amount = options.getInteger('amount');
      if (amount <= 0) return interaction.reply({ content: 'Injection amount must exceed zero.', ephemeral: true });

      const targetEco = getEco(target.id);
      targetEco.wallet += amount;

      const embed = getBaseEmbed(interaction, '#57F287')
        .setTitle('💰 SYSTEM CURRENCY INJECTION')
        .setDescription(`>>> High Command **${user.tag}** injected **$ ${amount.toLocaleString()} Coins** into ${target}'s portfolio.\n\n**Recipient Wallet:** \`$ ${targetEco.wallet.toLocaleString()}\``)
        .setThumbnail(target.displayAvatarURL());
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'leaderboard') {
      const sorted = [...userEconomy.entries()]
        .map(([id, data]) => ({ id, total: data.wallet + data.bank }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      let desc = '>>> The 10 wealthiest tycoons controlling the network pool.\n\n';
      for (let i = 0; i < sorted.length; i++) {
        const u = await client.users.fetch(sorted[i].id).catch(() => ({ username: 'Unknown Entity' }));
        desc += `**${i + 1}.** \`${u.username}\` — **$ ${sorted[i].total.toLocaleString()}**\n`;
      }
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#F1C40F').setTitle('🏆 FORBES TOP 10 TYCOONS').setDescription(desc)] });
    }

    // --------------------------------------------------------
    // RPG SHOP & AUTO-ROLE BUY SYSTEM (1M VIP)
    // --------------------------------------------------------
    else if (commandName === 'shop') {
      let desc = '>>> Welcome to the secure black-market terminal. Use `/buy <item_id>` to acquire items.\n\n';
      shopItems.forEach(item => {
        desc += `${item.emoji} **${item.name}** (\`${item.id}\`)\n└ Price: **$ ${item.price.toLocaleString()}**\n└ *${item.desc}*\n\n`;
      });
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#9B59B6').setTitle('🛒 DIGITAL BLACK-MARKETPLACE').setDescription(desc)] });
    }

    else if (commandName === 'buy') {
      const itemId = options.getString('item_id').toLowerCase();
      const item = shopItems.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: '❌ Target item identifier not found in database.', ephemeral: true });
      
      const eco = getEco(user.id);
      if (eco.wallet < item.price) {
        return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription(`>>> ❌ Transaction Failed: Insufficient liquid funds.\nRequired: \`$ ${item.price.toLocaleString()}\` | Your Wallet: \`$ ${eco.wallet.toLocaleString()}\``)], ephemeral: true });
      }
      
      const inv = getInv(user.id);
      if (inv.includes(item.id)) return interaction.reply({ content: '❌ You already own this digital asset.', ephemeral: true });
      
      // Auto-Role Integration for VIP Status
      if (item.id === 'vip_rank') {
        const roleName = 'VIP';
        const role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
          return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription(`>>> ❌ Configuration Error: Server par **"${roleName}"** naam ka role nahi mila! Pehle Discord mein ye role create karo.`)], ephemeral: true });
        }
        
        try {
          const member = await guild.members.fetch(user.id);
          await member.roles.add(role);
        } catch (err) {
          return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Role assignment failed. Check bot role hierarchy (Bot role must be placed above the VIP role).')], ephemeral: true });
        }
      }

      eco.wallet -= item.price;
      inv.push(item.id);
      
      const successDesc = item.id === 'vip_rank' 
        ? `>>> Successfully acquired ${item.emoji} **${item.name}** for **$ ${item.price.toLocaleString()}**.\n🎉 **Discord VIP Role assigned instantly!**`
        : `>>> Successfully acquired ${item.emoji} **${item.name}** for **$ ${item.price.toLocaleString()}**.\nAsset stored securely in your inventory vault.`;

      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('💳 SECURE PURCHASE CONFIRMED').setDescription(successDesc)] });
    }

    else if (commandName === 'inventory') {
      const inv = getInv(user.id);
      if (inv.length === 0) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription('>>> Your secure asset vault is currently empty.')], ephemeral: true });
      
      let desc = '>>> **Authenticated Digital Assets:**\n\n';
      inv.forEach(id => {
        const item = shopItems.find(i => i.id === id);
        if (item) desc += `${item.emoji} **${item.name}** (\`${item.id}\`)\n`;
      });
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#3498DB').setTitle('🎒 PERSONAL INVENTORY VAULT').setDescription(desc)] });
    }

    // --------------------------------------------------------
    // CASINO MINIGAMES (SLOTS & BLACKJACK)
    // --------------------------------------------------------
    else if (commandName === 'slots') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: '❌ Invalid wager amount or insufficient funds.', ephemeral: true });
      
      eco.wallet -= bet;
      const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
      const r = () => symbols[Math.floor(Math.random() * symbols.length)];
      const [s1, s2, s3] = [r(), r(), r()];
      
      let win = 0;
      if (s1 === s2 && s2 === s3) win = bet * 6; // Mega Jackpot
      else if (s1 === s2 || s2 === s3 || s1 === s3) win = bet * 2; // Minor Payout
      
      eco.wallet += win;
      const embed = getBaseEmbed(interaction, win > 0 ? '#F1C40F' : '#ED4245')
        .setTitle('🎰 CASINO SLOT MATRIX')
        .setDescription(`>>> **[ ${s1} | ${s2} | ${s3} ]**\n\n${win > 0 ? `🎉 **JACKPOT PAYOUT:** \`+ $ ${win.toLocaleString()}\`` : `💸 **HOUSE WINS:** \`- $ ${bet.toLocaleString()}\``}\n**Wallet Balance:** \`$ ${eco.wallet.toLocaleString()}\``);
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'blackjack') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: '❌ Invalid wager amount or insufficient funds.', ephemeral: true });
      
      eco.wallet -= bet;
      const draw = () => deckTemplate[Math.floor(Math.random() * deckTemplate.length)];
      
      let playerHand = [draw(), draw()];
      let dealerHand = [draw(), draw()];
      let pVal = calculateHand(playerHand);
      let dVal = calculateHand(dealerHand);

      const generateBJEmbed = (state, pHand, dHand, pV, dV, hideDealer = true) => {
        let color = '#3498DB';
        let title = '🃏 HIGH-STAKES TACTICAL BLACKJACK';
        let desc = `>>> **Active Wager:** \`$ ${bet.toLocaleString()}\`\n\n`;
        
        if (state === 'win') { color = '#57F287'; desc += `🎉 **VICTORY! Payout:** \`$ ${(bet*2).toLocaleString()}\``; }
        else if (state === 'lose') { color = '#ED4245'; desc += `💸 **BUST / LOSS:** \`- $ ${bet.toLocaleString()}\``; }
        else if (state === 'tie') { color = '#F1C40F'; desc += `🤝 **PUSH (TIE): Wager Refunded.**`; }
        else { desc += 'Select your combat maneuver: **Hit** or **Stand**.'; }

        return getBaseEmbed(interaction, color).setTitle(title).setDescription(desc).addFields(
          { name: `👤 Your Hand (${pV})`, value: `\`\`\`\n${pHand.join(' | ')}\n\`\`\``, inline: true },
          { name: `🤵 Dealer Hand (${hideDealer ? '?' : dV})`, value: `\`\`\`\n${dHand[0]} | ${hideDealer ? '?' : dHand.slice(1).join(' | ')}\n\`\`\``, inline: true }
        );
      };

      if (pVal === 21) {
        eco.wallet += bet * 2.5;
        return interaction.reply({ embeds: [generateBJEmbed('win', playerHand, dealerHand, pVal, dVal, false)] });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('HIT').setStyle(ButtonStyle.Success).setEmoji('👇'),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('STAND').setStyle(ButtonStyle.Danger).setEmoji('✋')
      );

      const msg = await interaction.reply({ embeds: [generateBJEmbed('playing', playerHand, dealerHand, pVal, dVal, true)], components: [row], fetchReply: true });
      
      const filter = i => i.user.id === user.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'bj_hit') {
          playerHand.push(draw());
          pVal = calculateHand(playerHand);
          if (pVal > 21) {
            collector.stop();
            await i.update({ embeds: [generateBJEmbed('lose', playerHand, dealerHand, pVal, dVal, false)], components: [] });
          } else {
            await i.update({ embeds: [generateBJEmbed('playing', playerHand, dealerHand, pVal, dVal, true)] });
          }
        } else if (i.customId === 'bj_stand') {
          collector.stop();
          while (dVal < 17) {
            dealerHand.push(draw());
            dVal = calculateHand(dealerHand);
          }
          let state = 'lose';
          if (dVal > 21 || pVal > dVal) { state = 'win'; eco.wallet += bet * 2; }
          else if (pVal === dVal) { state = 'tie'; eco.wallet += bet; }
          
          await i.update({ embeds: [generateBJEmbed(state, playerHand, dealerHand, pVal, dVal, false)], components: [] });
        }
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) msg.edit({ content: '⏱️ Blackjack match timed out. Wager forfeited.', components: [] }).catch(() => {});
      });
    }
  } catch (error) {
    console.error('[COMMAND EXCEPTION FATAL]', error);
  }
});

// ================= MODAL & BUTTON INTERACTION ROUTER =================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_setup_modal') {
      const modal = new ModalBuilder().setCustomId('server_setup_modal').setTitle('Minecraft Node Configuration');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ip').setLabel('Server IPv4 Address').setPlaceholder('play.yourserver.com').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('port').setLabel('Port Number').setPlaceholder('25565').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Network Tagline').setPlaceholder('Welcome to AuraMC!').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      await interaction.showModal(modal);
    }
    
    else if (interaction.customId === 'upvote' || interaction.customId === 'downvote') {
      const msg = interaction.message;
      const row = msg.components[0];
      const upBtn = ButtonBuilder.from(row.components[0]);
      const downBtn = ButtonBuilder.from(row.components[1]);
      
      if (interaction.customId === 'upvote') upBtn.setLabel((parseInt(upBtn.data.label) + 1).toString());
      if (interaction.customId === 'downvote') downBtn.setLabel((parseInt(downBtn.data.label) + 1).toString());
      
      const newRow = new ActionRowBuilder().addComponents(upBtn, downBtn);
      await interaction.update({ components: [newRow] });
    }
  }

  else if (interaction.isModalSubmit() && interaction.customId === 'server_setup_modal') {
    await interaction.deferReply({ ephemeral: true });
    const ip = interaction.fields.getTextInputValue('ip').trim();
    const port = interaction.fields.getTextInputValue('port').trim() || '25565';
    const desc = interaction.fields.getTextInputValue('desc');
    const address = `${ip}:${port}`;

    fs.writeFileSync(configPath, JSON.stringify({ ip, port, fullAddress: address, description: desc }, null, 2));
    const status = await checkMinecraftServer(ip, parseInt(port));
    await interaction.editReply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('✅ CONFIGURATION STORED').setDescription(`>>> Node endpoint bound successfully: \`${address}\`\nInitial Connection Ping: \`${status.online ? status.ping + 'ms' : 'Offline / Unreachable'}\``)] });
  }
});

// ================= SYSTEM ANTI-CRASH PROTOCOLS =================
process.on('unhandledRejection', (reason) => console.log('[WARNING] Unhandled Promise Rejection:', reason));
process.on('uncaughtException', (err) => console.log('[CRITICAL FAULT] Uncaught System Exception:', err));

// ================= AUTHENTICATION LOGIN =================
client.login(process.env.DISCORD_TOKEN);
