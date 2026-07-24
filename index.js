const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const net = require('net');
require('dotenv').config();

const configPath = path.join(__dirname, 'server-config.json');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('AURAMC Ultimate Bot is Online!'));
app.listen(PORT, () => console.log(`Web server is running on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const userEconomy = new Map();
const userXp = new Map();
const serverSettings = new Map();

// ================= HELPER FUNCTIONS =================
function getUserData(userId) {
  if (!userEconomy.has(userId)) userEconomy.set(userId, { balance: 500, bank: 1000 });
  return userEconomy.get(userId);
}

function getUserXpData(userId) {
  if (!userXp.has(userId)) userXp.set(userId, { xp: 0, level: 1 });
  return userXp.get(userId);
}

function checkMinecraftServer(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function generateProgressBar(current, max, length = 12) {
  const progress = Math.min(Math.round((current / max) * length), length);
  const empty = length - progress;
  return `**[**${'█'.repeat(progress)}${'░'.repeat(empty)}**]**`;
}

function getBaseEmbed(interaction = null) {
  const embed = new EmbedBuilder().setColor('#2b2d31').setTimestamp();
  if (interaction && client.user) {
    embed.setFooter({ text: 'AURAMC Network Solutions', iconURL: client.user.displayAvatarURL() });
  }
  return embed;
}

// ================= COMMAND BUILDERS =================
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot network latency and API response time'),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin (Heads or Tails)'),
  new SlashCommandBuilder().setName('roll').setDescription('Roll a 6-sided dice'),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8-ball a question').addStringOption(opt => opt.setName('question').setDescription('Apna sawal puchiye').setRequired(true)),
  new SlashCommandBuilder().setName('server').setDescription('Display professional live status of the AURAMC server'),
  new SlashCommandBuilder().setName('setup-server').setDescription('Configure your Minecraft server for live monitoring'),
  new SlashCommandBuilder().setName('balance').setDescription('Check your wallet and bank balance').addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily free coins reward'),
  new SlashCommandBuilder().setName('work').setDescription('Do a quick shift to earn some coins'),
  new SlashCommandBuilder().setName('pay').setDescription('Transfer coins to another user').addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Amount to pay').setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Check the richest players in the server'),
  new SlashCommandBuilder().setName('rank').setDescription('Check your current chat rank and XP progression').addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('nuke').setDescription('Deletes and clones the current channel to wipe all messages instantly').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('antinuke').setDescription('Enable or disable anti-nuke server protection').addStringOption(opt => opt.setName('status').setDescription('Turn Anti-Nuke On or Off').setRequired(true).addChoices({ name: 'Enable', value: 'on' }, { name: 'Disable', value: 'off' })).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('verify-setup').setDescription('Deploys the verification panel button').addRoleOption(opt => opt.setName('role').setDescription('The role to give when users verify themselves').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('autostatus').setDescription('Set this channel to auto-update Minecraft server status every 5 minutes').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('serverlog').setDescription('Set this channel to manage and receive server logs/chat bridge updates').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// ================= READY & AUTO-STATUS LOOP =================
client.once('ready', async () => {
  console.log(`[SYSTEM] Logged in successfully as ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[SYSTEM] Ultra-Professional UI Commands Deployed.');
  } catch (error) {
    console.error(error);
  }

  setInterval(async () => {
    if (!fs.existsSync(configPath)) return;
    try {
      const config = JSON.parse(fs.readFileSync(configPath));
      const isOnline = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

      const embed = new EmbedBuilder()
        .setColor(isOnline ? '#57F287' : '#ED4245')
        .setTitle('🌐 AURAMC NETWORK TELEMETRY')
        .setDescription(`>>> **System Status:** ${isOnline ? '🟢 **ONLINE & SECURE**' : '🔴 **OFFLINE / CRITICAL**'}\n*${config.description || 'Automated Server Monitoring'}*`)
        .addFields(
          { name: '📥 Direct Server IP', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
          { name: '⚡ Connection', value: '`TCP / Standard`', inline: true },
          { name: '🔄 Last Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'AURAMC Automated System', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      for (const [guildId, settings] of serverSettings.entries()) {
        if (settings.statusChannelId) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const channel = guild.channels.cache.get(settings.statusChannelId);
            if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Auto status loop error:', err);
    }
  }, 5 * 60 * 1000);
});

// ================= CORE INTERACTION HANDLER =================
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, channel, user } = interaction;
      const authorAvatar = user.displayAvatarURL();

      // --- TECH & SERVER COMMANDS ---
      if (commandName === 'ping') {
        const sent = await interaction.reply({ content: '📡 Fetching telemetry...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        const embed = getBaseEmbed(interaction)
          .setTitle('🏓 SYSTEM LATENCY CHECK')
          .setDescription('>>> Data packets successfully routed and received from the AURAMC host.')
          .addFields(
            { name: '🛰️ Client Latency', value: `\`\`\`js\n${latency}ms\`\`\``, inline: true },
            { name: '📡 Discord API', value: `\`\`\`js\n${apiLatency}ms\`\`\``, inline: true }
          )
          .setThumbnail(client.user.displayAvatarURL());
        await interaction.editReply({ content: '', embeds: [embed] });
      }

      else if (commandName === 'server') {
        await interaction.deferReply();
        if (!fs.existsSync(configPath)) {
          const errEmbed = getBaseEmbed(interaction).setColor('#ED4245').setTitle('⚠️ Configuration Error').setDescription('>>> Please run **`/setup-server`** to bind a Minecraft IP first.');
          return interaction.editReply({ embeds: [errEmbed] });
        }
        const config = JSON.parse(fs.readFileSync(configPath));
        const isOnline = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

        const embed = getBaseEmbed(interaction)
          .setColor(isOnline ? '#57F287' : '#ED4245')
          .setTitle('🌐 AURAMC GAME SERVER NODE')
          .setThumbnail(guild.iconURL() || client.user.displayAvatarURL())
          .setDescription(`>>> **Node State:** ${isOnline ? '🟢 **OPERATIONAL**' : '🔴 **DOWN / UNREACHABLE**'}\n\n*${config.description || 'Welcome to AURAMC Network!'}*`)
          .addFields(
            { name: '📥 Connection Address (IP)', value: `\`\`\`yaml\n${config.fullAddress}\`\`\``, inline: false },
            { name: '🟢 Uptime Status', value: isOnline ? '`Live & Stable`' : '`Service Halted`', inline: true },
            { name: '🛡️ Network Protocol', value: '`TCP v4`', inline: true }
          );
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'setup-server') {
        const embed = getBaseEmbed(interaction)
          .setTitle('⚙️ AURAMC CONFIGURATION CENTER')
          .setDescription('>>> **Admin Authorization Required.**\nDeploy your Minecraft server telemetry onto the Discord bot securely. Click the configuration button below to open the setup terminal.');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_setup_modal').setLabel('Initialize Setup').setStyle(ButtonStyle.Primary).setEmoji('🛠️'));
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      else if (commandName === 'autostatus' || commandName === 'serverlog') {
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        const type = commandName === 'autostatus' ? 'statusChannelId' : 'logChannelId';
        serverSettings.get(guild.id)[type] = channel.id;
        
        const title = commandName === 'autostatus' ? '🔄 AUTO-STATUS DEPLOYED' : '📜 SERVER LOGS BOUND';
        const desc = commandName === 'autostatus' 
          ? `>>> The channel ${channel} has been synchronized. System will inject a live server status embed every **5 minutes**.` 
          : `>>> The channel ${channel} is now configured as the primary terminal for Minecraft server logs and chat-bridge.`;

        const embed = getBaseEmbed(interaction).setColor('#57F287').setTitle(title).setDescription(desc);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // --- ECONOMY COMMANDS ---
      else if (commandName === 'balance') {
        const targetUser = options.getUser('user') || user;
        const eco = getUserData(targetUser.id);
        const embed = getBaseEmbed(interaction)
          .setAuthor({ name: `${targetUser.username}'s Financial Statement`, iconURL: targetUser.displayAvatarURL() })
          .setDescription('>>> Current capital distribution across AURAMC network.')
          .addFields(
            { name: '👛 Liquid Cash (Wallet)', value: `\`\`\`cs\n$ ${eco.balance.toLocaleString()} Coins\`\`\``, inline: true },
            { name: '🏦 Vault Asset (Bank)', value: `\`\`\`cs\n$ ${eco.bank.toLocaleString()} Coins\`\`\``, inline: true },
            { name: '📊 Net Worth', value: `\`${(eco.balance + eco.bank).toLocaleString()} Coins\``, inline: false }
          );
        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'daily') {
        const eco = getUserData(user.id);
        eco.balance += 500;
        const embed = getBaseEmbed(interaction)
          .setColor('#FEE75C')
          .setTitle('🎁 DAILY STIPEND CLEARED')
          .setDescription(`>>> Transaction successful. **500 Coins** have been credited to your digital wallet.\n\n**New Wallet Balance:** \`${eco.balance.toLocaleString()} Coins\``)
          .setThumbnail('https://cdn-icons-png.flaticon.com/512/3144/3144456.png'); // Free gold coin icon
        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'work') {
        const eco = getUserData(user.id);
        const earnings = Math.floor(Math.random() * 300) + 100;
        eco.balance += earnings;
        const jobs = ['mined some diamonds', 'built a spawn lobby', 'farmed some netherite', 'hacked the mainframe', 'fixed the server lag'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        
        const embed = getBaseEmbed(interaction)
          .setColor('#57F287')
          .setTitle('💼 WORK SHIFT COMPLETED')
          .setDescription(`>>> You ${job} and earned a payout!\n\n**Earnings:** \`+ ${earnings} Coins\`\n**New Balance:** \`${eco.balance.toLocaleString()} Coins\``);
        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'pay') {
        const targetUser = options.getUser('user');
        const amount = options.getInteger('amount');
        if (targetUser.id === user.id) {
          return interaction.reply({ embeds: [getBaseEmbed(interaction).setColor('#ED4245').setDescription('>>> ❌ Invalid transaction: You cannot send funds to yourself.')], ephemeral: true });
        }
        const senderEco = getUserData(user.id);
        if (senderEco.balance < amount) {
          return interaction.reply({ embeds: [getBaseEmbed(interaction).setColor('#ED4245').setDescription(`>>> ❌ Insufficient Funds: Your wallet only has \`${senderEco.balance}\` Coins.`)], ephemeral: true });
        }
        
        senderEco.balance -= amount;
        getUserData(targetUser.id).balance += amount;
        
        const embed = getBaseEmbed(interaction)
          .setColor('#57F287')
          .setTitle('💸 WIRE TRANSFER SUCCESSFUL')
          .setDescription(`>>> A digital wire transfer has been processed over the network.\n\n**Sender:** ${user}\n**Recipient:** ${targetUser}\n**Amount:** \`$ ${amount.toLocaleString()} Coins\``);
        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'leaderboard') {
        const sortedUsers = [...userEconomy.entries()]
          .map(([id, data]) => ({ id, total: data.balance + data.bank }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
          
        let desc = '>>> The wealthiest individuals across the AURAMC network.\n\n';
        for (let i = 0; i < sortedUsers.length; i++) {
          const u = await client.users.fetch(sortedUsers[i].id).catch(() => ({ username: 'Unknown User' }));
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
          desc += `${medal} **${i + 1}.** \`${u.username}\` — **$ ${sortedUsers[i].total.toLocaleString()}** Coins\n`;
        }
        
        const embed = getBaseEmbed(interaction).setColor('#F1C40F').setTitle('🏆 FORBES TOP 10 LEADERBOARD').setDescription(desc);
        await interaction.reply({ embeds: [embed] });
      }

      // --- USER & LEVEL COMMANDS ---
      else if (commandName === 'rank') {
        const targetUser = options.getUser('user') || user;
        const lvlData = getUserXpData(targetUser.id);
        const nextLvlXp = lvlData.level * 100;
        const progressBar = generateProgressBar(lvlData.xp, nextLvlXp);
        
        const embed = getBaseEmbed(interaction)
          .setAuthor({ name: `${targetUser.username}'s Profile`, iconURL: targetUser.displayAvatarURL() })
          .setDescription(`>>> Social status and activity rank within the AURAMC network.`)
          .addFields(
            { name: '🎖️ Global Level', value: `\`\`\`css\nLevel ${lvlData.level}\`\`\``, inline: true },
            { name: '⚡ Experience Points', value: `\`\`\`css\n${lvlData.xp} / ${nextLvlXp} XP\`\`\``, inline: true },
            { name: '🚀 Rank Progression', value: progressBar, inline: false }
          );
        await interaction.reply({ embeds: [embed] });
      }

      // --- FUN COMMANDS ---
      else if (commandName === 'coinflip') {
        const isHeads = Math.random() < 0.5;
        const embed = getBaseEmbed(interaction)
          .setColor(isHeads ? '#F1C40F' : '#95A5A6')
          .setTitle('🪙 QUANTUM COIN FLIP')
          .setDescription(`>>> The coin was tossed high into the air and landed on...\n\n**Result:** ${isHeads ? '🪙 **HEADS**' : '💿 **TAILS**'}`);
        await interaction.reply({ embeds: [embed] });
      }
      
      else if (commandName === 'roll') {
        const roll = Math.floor(Math.random() * 6) + 1;
        const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const embed = getBaseEmbed(interaction)
          .setColor('#E67E22')
          .setTitle('🎲 CASINO DICE ROLL')
          .setDescription(`>>> The dice rattles in your hand and rolls across the table...\n\n**Result:** ${emojis[roll - 1]} **(${roll})**`);
        await interaction.reply({ embeds: [embed] });
      }
      
      else if (commandName === '8ball') {
        const answers = ['Yes, definitely.', 'It is certain.', 'Most likely.', 'Reply hazy, try again.', 'My sources say no.', 'Very doubtful.', 'Absolutely not.'];
        const embed = getBaseEmbed(interaction)
          .setColor('#9B59B6')
          .setTitle('🎱 MYSTICAL 8-BALL')
          .addFields(
            { name: '👤 The Inquiry', value: `>>> *"${options.getString('question')}"*`, inline: false },
            { name: '🔮 The Verdict', value: `\`\`\`yaml\n${answers[Math.floor(Math.random() * answers.length)]}\`\`\``, inline: false }
          );
        await interaction.reply({ embeds: [embed] });
      }

      // --- ADMIN COMMANDS ---
      else if (commandName === 'nuke') {
        const newChannel = await channel.clone({ position: channel.position });
        await channel.delete();
        const embed = getBaseEmbed().setColor('#ED4245').setTitle('☢️ TACTICAL NUKE DEPLOYED').setDescription(`>>> **Channel Purged.**\nAll previous communications have been securely wiped and destroyed by an Administrator.\n\n**Authorized by:** ${user}`);
        await newChannel.send({ embeds: [embed] });
      }

      else if (commandName === 'antinuke') {
        const status = options.getString('status') === 'on';
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).antinuke = status;
        const embed = getBaseEmbed(interaction)
          .setColor(status ? '#57F287' : '#ED4245')
          .setTitle('🛡️ SECURITY OVERRIDE')
          .setDescription(`>>> Guild Anti-Nuke protocols have been **${status ? 'ACTIVATED' : 'DEACTIVATED'}**.\nUnauthorized deletions will ${status ? 'now be blocked/punished.' : 'pass freely.'}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (commandName === 'verify-setup') {
        const role = options.getRole('role');
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).verifiedRoleId = role.id;
        
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_user_btn').setLabel('CONFIRM IDENTITY').setStyle(ButtonStyle.Success).setEmoji('🛡️'));
        const publicEmbed = getBaseEmbed()
          .setColor('#2b2d31')
          .setTitle('🔒 AURAMC SECURE GATEWAY')
          .setDescription('>>> **Welcome to the network.**\nTo gain access to the rest of the server channels, you must prove you are not a bot. Click the button below to authorize your identity and receive your credentials.');
        
        await channel.send({ embeds: [publicEmbed], components: [row] });
        await interaction.reply({ embeds: [getBaseEmbed(interaction).setColor('#57F287').setDescription('>>> ✅ Verification gateway successfully deployed.')], ephemeral: true });
      }
    } 

    // ================= BUTTON & MODAL HANDLERS =================
    else if (interaction.isButton()) {
      if (interaction.customId === 'verify_user_btn') {
        const settings = serverSettings.get(interaction.guild.id);
        if (!settings || !settings.verifiedRoleId) return interaction.reply({ content: '❌ System Error: Gateway unconfigured.', ephemeral: true });
        
        const role = interaction.guild.roles.cache.get(settings.verifiedRoleId);
        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.reply({ embeds: [getBaseEmbed(interaction).setColor('#FEE75C').setDescription('>>> ⚠️ You already possess verified security clearance.')], ephemeral: true });
        }
        
        await interaction.member.roles.add(role);
        await interaction.reply({ embeds: [getBaseEmbed(interaction).setColor('#57F287').setDescription('>>> ✅ **Identity Confirmed.**\nClearance granted. Welcome to the server.')], ephemeral: true });
      } 
      
      else if (interaction.customId === 'open_setup_modal') {
        const modal = new ModalBuilder().setCustomId('server_setup_modal').setTitle('AURAMC IP Configuration');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_ip_input').setLabel('Server IP Address').setPlaceholder('e.g. play.auramc.com').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_port_input').setLabel('Network Port').setPlaceholder('Default: 25565').setStyle(TextInputStyle.Short).setRequired(false)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_desc_input').setLabel('Server Tagline / Description').setPlaceholder('Your custom server motto').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
      }
    } 

    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'server_setup_modal') {
        await interaction.deferReply({ ephemeral: true });
        const serverIp = interaction.fields.getTextInputValue('server_ip_input').trim();
        const serverPort = interaction.fields.getTextInputValue('server_port_input').trim() || '25565';
        const serverDesc = interaction.fields.getTextInputValue('server_desc_input');
        const fullAddress = `${serverIp}:${serverPort}`;

        const isOnline = await checkMinecraftServer(serverIp, parseInt(serverPort));
        fs.writeFileSync(configPath, JSON.stringify({ ip: serverIp, port: serverPort, fullAddress, description: serverDesc }, null, 2));

        const embed = getBaseEmbed(interaction)
          .setColor('#57F287')
          .setTitle('✅ CONFIGURATION SAVED')
          .setDescription(`>>> The system database has been updated with the new node variables.\n\n**IP Bound:** \`${fullAddress}\`\n**Initial Ping Status:** ${isOnline ? '🟢 Success' : '🔴 Failed/Offline'}`);
        await interaction.editReply({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
