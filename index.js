/**
 * ============================================================================
 * AURAMC NETWORK ENGINE - v4.0 (ULTRA-PROFESSIONAL RPG & UTILITY BUILD)
 * ============================================================================
 * Features: Advanced Economy, Blackjack Casino, Global Leveling, Hardware Telemetry,
 * Item Shop, Auto-Status, and Advanced Suggestion System.
 * (Moderation omitted to prevent overlap with Bot 1)
 */

const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
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
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
require('dotenv').config();

// ================= EXPRESS WEB SERVER (24/7 UPTIME) =================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('AURAMC Node Engine is fully operational.'));
app.listen(PORT, () => console.log(`[NETWORK] Express server bound to port ${PORT}`));

// ================= DISCORD CLIENT INIT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ================= IN-MEMORY DATABASES =================
// Note: For production, replace Maps with MongoDB/MySQL
const userEconomy = new Map();
const userInventory = new Map();
const userXp = new Map();
const serverSettings = new Map();
const cooldowns = new Map();

const configPath = path.join(__dirname, 'server-config.json');

// ================= ECONOMY & RPG SHOP ITEMS =================
const shopItems = [
  { id: 'vip_rank', name: 'VIP Status', price: 50000, desc: 'Exclusive VIP Role on the server', emoji: '💎' },
  { id: 'custom_sword', name: 'AuraMC Sword', price: 15000, desc: 'A mythical sword for bragging rights', emoji: '⚔️' },
  { id: 'lootbox', name: 'Mystery Lootbox', price: 5000, desc: 'Open for random rewards!', emoji: '🎁' },
  { id: 'shield', name: 'Robbery Shield', price: 10000, desc: 'Protects you from being robbed once', emoji: '🛡️' }
];

// ================= CORE HELPER FUNCTIONS =================
function getEco(userId) {
  if (!userEconomy.has(userId)) userEconomy.set(userId, { wallet: 500, bank: 1500 });
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

function generateProgressBar(current, max, length = 14) {
  const progress = Math.min(Math.round((current / max) * length), length);
  const empty = length - progress;
  return `**[**${'█'.repeat(progress)}${'░'.repeat(empty)}**]**`;
}

function getBaseEmbed(interaction = null, color = '#2b2d31') {
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  if (interaction && client.user) {
    embed.setFooter({ text: 'AURAMC Systems | Core Engine v4.0', iconURL: client.user.displayAvatarURL() });
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

// ================= BLACKJACK ENGINE =================
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

// ================= COMMAND BUILDERS =================
const commands = [
  // --- Minecraft & Utility ---
  new SlashCommandBuilder().setName('server').setDescription('Live status of the AURAMC Minecraft server'),
  new SlashCommandBuilder().setName('setup-server').setDescription('Bind a Minecraft IP to the bot'),
  new SlashCommandBuilder().setName('autostatus').setDescription('Set this channel to auto-update server status'),
  new SlashCommandBuilder().setName('botinfo').setDescription('View advanced telemetry and hardware usage of the bot'),
  new SlashCommandBuilder().setName('suggest').setDescription('Submit a suggestion to the server').addStringOption(o => o.setName('idea').setDescription('Your suggestion').setRequired(true)),

  // --- Economy Engine ---
  new SlashCommandBuilder().setName('balance').setDescription('View financial portfolio').addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('deposit').setDescription('Deposit money into the bank').addIntegerOption(o => o.setName('amount').setDescription('Amount to deposit').setRequired(true)),
  new SlashCommandBuilder().setName('withdraw').setDescription('Withdraw money from the bank').addIntegerOption(o => o.setName('amount').setDescription('Amount to withdraw').setRequired(true)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily allowance'),
  new SlashCommandBuilder().setName('weekly').setDescription('Claim your massive weekly allowance'),
  new SlashCommandBuilder().setName('work').setDescription('Perform network maintenance for cash'),
  new SlashCommandBuilder().setName('pay').setDescription('Wire transfer funds').addUserOption(o => o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('rob').setDescription('Attempt a network heist on a user').addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the top 10 wealthiest users'),

  // --- RPG Shop & Items ---
  new SlashCommandBuilder().setName('shop').setDescription('Browse the AuraMC digital marketplace'),
  new SlashCommandBuilder().setName('buy').setDescription('Purchase an item from the shop').addStringOption(o => o.setName('item_id').setDescription('The ID of the item').setRequired(true)),
  new SlashCommandBuilder().setName('inventory').setDescription('View your owned items'),

  // --- Casino Minigames ---
  new SlashCommandBuilder().setName('slots').setDescription('Bet on the slot machine').addIntegerOption(o => o.setName('bet').setDescription('Amount to wager').setRequired(true)),
  new SlashCommandBuilder().setName('blackjack').setDescription('Play Blackjack (21) against the dealer').addIntegerOption(o => o.setName('bet').setDescription('Amount to wager').setRequired(true)),

  // --- Leveling ---
  new SlashCommandBuilder().setName('rank').setDescription('Check your network clearance level and XP').addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false))
].map(cmd => cmd.toJSON());

// ================= BOOT SEQUENCE =================
client.once(Events.ClientReady, async () => {
  console.log(`[SYSTEM] Core Engine Online. Authenticated as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[SYSTEM] 20 Advanced Utility & Economy Commands Deployed.');
  } catch (error) {
    console.error('[ERROR] Command Sync Failed:', error);
  }

  // --- Auto-Status Telemetry Loop ---
  setInterval(async () => {
    if (!fs.existsSync(configPath)) return;
    try {
      const config = JSON.parse(fs.readFileSync(configPath));
      const status = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

      const embed = new EmbedBuilder()
        .setColor(status.online ? '#57F287' : '#ED4245')
        .setTitle('🌐 AURAMC NETWORK TELEMETRY')
        .setDescription(`>>> **Node Status:** ${status.online ? '🟢 **ONLINE & STABLE**' : '🔴 **OFFLINE / CRITICAL**'}\n*Monitoring main cluster connection.*`)
        .addFields(
          { name: '📥 Target IP', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
          { name: '⚡ Node Latency', value: `\`${status.online ? status.ping + 'ms' : 'N/A'}\``, inline: true },
          { name: '🔄 Last Sync', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'AURAMC Automated Subsystem', iconURL: client.user.displayAvatarURL() })
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
  }, 5 * 60 * 1000); // 5 Minutes
});

// ================= AUTOMATED XP SYSTEM =================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  // Add random XP between 15-25 every message (with 1 min cooldown)
  const cd = checkCooldown(message.author.id, 'xp_gain', 60000);
  if (!cd) {
    const xpData = getXp(message.author.id);
    const xpGained = Math.floor(Math.random() * 10) + 15;
    xpData.xp += xpGained;

    const nextLevelXp = xpData.level * 150;
    if (xpData.xp >= nextLevelXp) {
      xpData.level++;
      xpData.xp -= nextLevelXp;
      
      const embed = getBaseEmbed(null, '#F1C40F')
        .setTitle('🆙 CLEARANCE UPGRADE')
        .setDescription(`>>> Congratulations ${message.author}! Your network clearance has been upgraded.\n\n**New Level:** \`Level ${xpData.level}\``)
        .setThumbnail(message.author.displayAvatarURL());
      
      await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
});

// ================= CORE INTERACTION HANDLER =================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, user } = interaction;
  
  try {
    // --------------------------------------------------------
    // UTILITY & SERVER COMMANDS
    // --------------------------------------------------------
    if (commandName === 'server') {
      await interaction.deferReply();
      if (!fs.existsSync(configPath)) {
        return interaction.editReply({ embeds: [getBaseEmbed(interaction, '#ED4245').setTitle('⚠️ System Error').setDescription('>>> Node IP not bound. Run **`/setup-server`**.')] });
      }
      const config = JSON.parse(fs.readFileSync(configPath));
      const status = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

      const embed = getBaseEmbed(interaction, status.online ? '#57F287' : '#ED4245')
        .setTitle('🌐 AURAMC GAME NODE STATUS')
        .setThumbnail(guild.iconURL() || client.user.displayAvatarURL())
        .setDescription(`>>> **Node State:** ${status.online ? '🟢 **OPERATIONAL**' : '🔴 **DOWN / UNREACHABLE**'}\n*${config.description || 'Welcome to AuraMC!'}*`)
        .addFields(
          { name: '📥 Connection IP', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
          { name: '⚡ Response Ping', value: `\`${status.online ? status.ping + 'ms' : 'Failure'}\``, inline: true },
          { name: '🛡️ Protocol', value: '`TCP v4 Secure`', inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    }

    else if (commandName === 'setup-server' || commandName === 'autostatus') {
      if (!interaction.member.permissions.has('Administrator')) return interaction.reply({ content: 'Requires Administrator protocol.', ephemeral: true });
      
      if (commandName === 'setup-server') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_setup_modal').setLabel('Access Terminal').setStyle(ButtonStyle.Primary).setEmoji('🛠️'));
        await interaction.reply({ embeds: [getBaseEmbed(interaction).setTitle('⚙️ CONFIGURATION CENTER').setDescription('>>> Deploy MC Telemetry.')], components: [row], ephemeral: true });
      } else {
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).statusChannelId = channel.id;
        await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🔄 TELEMETRY BOUND').setDescription(`>>> Auto-status will be injected into ${channel} every 5 minutes.`)], ephemeral: true });
      }
    }

    else if (commandName === 'botinfo') {
      const core = os.cpus()[0];
      const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const uptime = `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`;
      
      const embed = getBaseEmbed(interaction, '#3498DB')
        .setTitle('🤖 ENGINE HARDWARE DIAGNOSTICS')
        .setDescription('>>> Internal diagnostics and hardware utilization metrics.')
        .addFields(
          { name: '🧠 CPU Processor', value: `\`\`\`yaml\n${core.model}\`\`\``, inline: false },
          { name: '💾 RAM Usage', value: `\`${ramUsed} MB\` / \`${totalRam} GB\``, inline: true },
          { name: '📡 Gateway Ping', value: `\`${client.ws.ping}ms\``, inline: true },
          { name: '🕒 System Uptime', value: uptime, inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL());
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'suggest') {
      const idea = options.getString('idea');
      const embed = getBaseEmbed(interaction, '#9B59B6')
        .setAuthor({ name: `${user.username}'s Proposal`, iconURL: user.displayAvatarURL() })
        .setTitle('💡 NEW NETWORK SUGGESTION')
        .setDescription(`>>> ${idea}`);
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('upvote').setLabel('0').setStyle(ButtonStyle.Success).setEmoji('👍'),
        new ButtonBuilder().setCustomId('downvote').setLabel('0').setStyle(ButtonStyle.Danger).setEmoji('👎')
      );
      
      const msg = await channel.send({ embeds: [embed], components: [row] });
      await msg.startThread({ name: `Discussion: ${user.username}'s Idea`, autoArchiveDuration: 1440 });
      await interaction.reply({ content: 'Suggestion successfully transmitted.', ephemeral: true });
    }

    // --------------------------------------------------------
    // LEVELING SYSTEM
    // --------------------------------------------------------
    else if (commandName === 'rank') {
      const target = options.getUser('user') || user;
      const data = getXp(target.id);
      const nextXp = data.level * 150;
      const embed = getBaseEmbed(interaction, '#9B59B6')
        .setAuthor({ name: `Clearance Profile: ${target.username}`, iconURL: target.displayAvatarURL() })
        .setDescription('>>> Global network activity status.')
        .addFields(
          { name: '🎖️ Clearance Level', value: `\`\`\`css\nLevel ${data.level}\`\`\``, inline: true },
          { name: '⚡ Accumulated XP', value: `\`\`\`css\n${data.xp} / ${nextXp} XP\`\`\``, inline: true },
          { name: '🚀 Progress', value: generateProgressBar(data.xp, nextXp), inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }

    // --------------------------------------------------------
    // ADVANCED ECONOMY ENGINE
    // --------------------------------------------------------
    else if (commandName === 'balance') {
      const target = options.getUser('user') || user;
      const eco = getEco(target.id);
      const embed = getBaseEmbed(interaction, '#57F287')
        .setAuthor({ name: `${target.username}'s Portfolio`, iconURL: target.displayAvatarURL() })
        .addFields(
          { name: '👛 Wallet (Liquid)', value: `\`\`\`cs\n$ ${eco.wallet.toLocaleString()}\`\`\``, inline: true },
          { name: '🏦 Bank (Vault)', value: `\`\`\`cs\n$ ${eco.bank.toLocaleString()}\`\`\``, inline: true },
          { name: '📊 Total Assets', value: `\`$ ${(eco.wallet + eco.bank).toLocaleString()}\``, inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'deposit') {
      const amount = options.getInteger('amount');
      const eco = getEco(user.id);
      if (amount <= 0 || eco.wallet < amount) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Transaction Failed: Insufficient liquid funds.')], ephemeral: true });
      eco.wallet -= amount;
      eco.bank += amount;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🏦 VAULT DEPOSIT').setDescription(`>>> Successfully transferred **$ ${amount.toLocaleString()}** to the secure vault.\n**New Bank Balance:** \`$ ${eco.bank.toLocaleString()}\``)] });
    }

    else if (commandName === 'withdraw') {
      const amount = options.getInteger('amount');
      const eco = getEco(user.id);
      if (amount <= 0 || eco.bank < amount) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Transaction Failed: Insufficient vault funds.')], ephemeral: true });
      eco.bank -= amount;
      eco.wallet += amount;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('🏦 VAULT WITHDRAWAL').setDescription(`>>> Successfully extracted **$ ${amount.toLocaleString()}** to wallet.\n**New Wallet Balance:** \`$ ${eco.wallet.toLocaleString()}\``)] });
    }

    else if (commandName === 'daily' || commandName === 'weekly') {
      const isDaily = commandName === 'daily';
      const delay = isDaily ? 86400000 : 604800000;
      const cd = checkCooldown(user.id, commandName, delay);
      
      if (cd) {
        return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription(`>>> ⏳ Cooldown Active: Funds locked until <t:${Math.floor(cd / 1000)}:R>.`)], ephemeral: true });
      }
      const eco = getEco(user.id);
      const reward = isDaily ? 1000 : 7500;
      eco.wallet += reward;
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#FEE75C').setTitle(isDaily ? '🎁 DAILY STIPEND' : '🎁 WEEKLY STIPEND').setDescription(`>>> Claimed **$ ${reward.toLocaleString()}**.\n**New Wallet Balance:** \`$ ${eco.wallet.toLocaleString()}\``)] });
    }

    else if (commandName === 'work') {
      const cd = checkCooldown(user.id, 'work', 3600000); // 1 Hour
      if (cd) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription(`>>> ⏳ Resting. Next shift available <t:${Math.floor(cd / 1000)}:R>.`)], ephemeral: true });
      
      const eco = getEco(user.id);
      const wage = Math.floor(Math.random() * 800) + 200;
      const jobs = ['patched a zero-day exploit', 'mined a chunk of ancient debris', 'configured a BungeeCord node', 'sold some digital real estate'];
      eco.wallet += wage;
      
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('💼 SHIFT COMPLETED').setDescription(`>>> You ${jobs[Math.floor(Math.random() * jobs.length)]} and earned **$ ${wage}**.\n**Wallet:** \`$ ${eco.wallet}\``)] });
    }

    else if (commandName === 'leaderboard') {
      const sorted = [...userEconomy.entries()]
        .map(([id, data]) => ({ id, total: data.wallet + data.bank }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      let desc = '>>> The 10 wealthiest entities on the network.\n\n';
      for (let i = 0; i < sorted.length; i++) {
        const u = await client.users.fetch(sorted[i].id).catch(() => ({ username: 'Unknown' }));
        desc += `**${i + 1}.** \`${u.username}\` — **$ ${sorted[i].total.toLocaleString()}**\n`;
      }
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#F1C40F').setTitle('🏆 FORBES TOP 10').setDescription(desc)] });
    }

    // --------------------------------------------------------
    // RPG SHOP & INVENTORY
    // --------------------------------------------------------
    else if (commandName === 'shop') {
      let desc = '>>> Welcome to the Black Market. Use `/buy <item_id>` to purchase.\n\n';
      shopItems.forEach(item => {
        desc += `${item.emoji} **${item.name}** (\`${item.id}\`)\n└ Price: **$ ${item.price.toLocaleString()}**\n└ *${item.desc}*\n\n`;
      });
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#9B59B6').setTitle('🛒 DIGITAL MARKETPLACE').setDescription(desc)] });
    }

    else if (commandName === 'buy') {
      const itemId = options.getString('item_id').toLowerCase();
      const item = shopItems.find(i => i.id === itemId);
      if (!item) return interaction.reply({ content: 'Item ID not found in database.', ephemeral: true });
      
      const eco = getEco(user.id);
      if (eco.wallet < item.price) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#ED4245').setDescription('>>> ❌ Insufficient liquid funds.')], ephemeral: true });
      
      const inv = getInv(user.id);
      if (inv.includes(item.id)) return interaction.reply({ content: 'You already own this digital asset.', ephemeral: true });
      
      eco.wallet -= item.price;
      inv.push(item.id);
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('💳 PURCHASE SUCCESSFUL').setDescription(`>>> You securely purchased ${item.emoji} **${item.name}** for **$ ${item.price.toLocaleString()}**.\nIt has been added to your inventory.`)] });
    }

    else if (commandName === 'inventory') {
      const inv = getInv(user.id);
      if (inv.length === 0) return interaction.reply({ embeds: [getBaseEmbed(interaction, '#E67E22').setDescription('>>> Your digital vault is empty.')] });
      
      let desc = '>>> **Secure Asset Vault:**\n\n';
      inv.forEach(id => {
        const item = shopItems.find(i => i.id === id);
        if (item) desc += `${item.emoji} **${item.name}**\n`;
      });
      await interaction.reply({ embeds: [getBaseEmbed(interaction, '#3498DB').setTitle('🎒 INVENTORY').setDescription(desc)] });
    }

    // --------------------------------------------------------
    // CASINO: SLOTS & BLACKJACK (Heavy Logic)
    // --------------------------------------------------------
    else if (commandName === 'slots') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: 'Invalid funds for wager.', ephemeral: true });
      
      eco.wallet -= bet;
      const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
      const r = () => symbols[Math.floor(Math.random() * symbols.length)];
      const [s1, s2, s3] = [r(), r(), r()];
      
      let win = 0;
      if (s1 === s2 && s2 === s3) win = bet * 5; // Jackpot
      else if (s1 === s2 || s2 === s3 || s1 === s3) win = bet * 2; // Mini-win
      
      eco.wallet += win;
      const embed = getBaseEmbed(interaction, win > 0 ? '#F1C40F' : '#ED4245')
        .setTitle('🎰 CASINO SLOTS')
        .setDescription(`>>> **[ ${s1} \vert{}${s2} | ${s3} ]**\n\n${win > 0 ? `🎉 **PAYOUT:** \`+ $ ${win.toLocaleString()}\`` : `💸 **BUST:** \`- $ ${bet.toLocaleString()}\``}\n**Wallet:** \`$ ${eco.wallet.toLocaleString()}\``);
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'blackjack') {
      const bet = options.getInteger('bet');
      const eco = getEco(user.id);
      if (bet <= 0 || eco.wallet < bet) return interaction.reply({ content: 'Invalid funds for wager.', ephemeral: true });
      
      eco.wallet -= bet;
      const draw = () => deckTemplate[Math.floor(Math.random() * deckTemplate.length)];
      
      let playerHand = [draw(), draw()];
      let dealerHand = [draw(), draw()];
      let pVal = calculateHand(playerHand);
      let dVal = calculateHand(dealerHand);

      const generateBJEmbed = (state, pHand, dHand, pV, dV, hideDealer = true) => {
        let color = '#3498DB';
        let title = '🃏 HIGH-STAKES BLACKJACK';
        let desc = `>>> **Wager:** \`$ ${bet.toLocaleString()}\`\n\n`;
        
        if (state === 'win') { color = '#57F287'; desc += `🎉 **YOU WON \`$ ${(bet*2).toLocaleString()}\`**`; }
        else if (state === 'lose') { color = '#ED4245'; desc += `💸 **YOU BUSTED/LOST \`$ ${bet.toLocaleString()}\`**`; }
        else if (state === 'tie') { color = '#F1C40F'; desc += `🤝 **PUSH (TIE) - Wager Returned.**`; }
        else { desc += 'Hit or Stand? Make your move.'; }

        return getBaseEmbed(interaction, color).setTitle(title).setDescription(desc).addFields(
          { name: `👤 Your Hand (${pV})`, value: `\`\`\`\n${pHand.join(' | ')}\n\`\`\``, inline: true },
          { name: `🤵 Dealer's Hand (${hideDealer ? '?' : dV})`, value: `\`\`\`\n${dHand[0]} | ${hideDealer ? '?' : dHand.slice(1).join(' | ')}\n\`\`\``, inline: true }
        );
      };

      if (pVal === 21) {
        eco.wallet += bet * 2.5; // Blackjack pays 3:2
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
        if (collected.size === 0) msg.edit({ content: 'Game timed out. Wager lost.', components: [] }).catch(() => {});
      });
    }
  } catch (error) {
    console.error('[COMMAND EXCEPTION]', error);
  }
});

// ================= MODAL & BUTTON HANDLERS =================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_setup_modal') {
      const modal = new ModalBuilder().setCustomId('server_setup_modal').setTitle('Node Configuration');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ip').setLabel('Server IP').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('port').setLabel('Port').setPlaceholder('25565').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Tagline').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      await interaction.showModal(modal);
    }
    
    // Suggestion System Upvote/Downvote
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
    await interaction.editReply({ embeds: [getBaseEmbed(interaction, '#57F287').setTitle('✅ CONFIG SAVED').setDescription(`>>> Address Bound: \`${address}\`\nInitial Ping: \`${status.online ? status.ping + 'ms' : 'Offline'}\``)] });
  }
});

// ================= ANTI-CRASH PROTOCOLS =================
process.on('unhandledRejection', (reason) => console.log('[WARNING] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.log('[CRITICAL] Uncaught Exception:', err));

client.login(process.env.DISCORD_TOKEN);
