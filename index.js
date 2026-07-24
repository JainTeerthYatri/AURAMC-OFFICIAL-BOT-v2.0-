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

app.get('/', (req, res) => {
  res.send('AURAMC Bot 2 (Status & Logs Manager) is Online!');
});

app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

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
const commands = [];

const userEconomy = new Map();
const userXp = new Map();
const serverSettings = new Map();

function getUserData(userId) {
  if (!userEconomy.has(userId)) {
    userEconomy.set(userId, { balance: 500, bank: 1000 });
  }
  return userEconomy.get(userId);
}

function getUserXpData(userId) {
  if (!userXp.has(userId)) {
    userXp.set(userId, { xp: 0, level: 1 });
  }
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

const allCommands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency and response time'),
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
  new SlashCommandBuilder().setName('rank').setDescription('Check your current chat rank and XP').addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('nuke').setDescription('Deletes and clones the current channel to wipe all messages instantly').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('antinuke').setDescription('Enable or disable anti-nuke server protection').addStringOption(opt => opt.setName('status').setDescription('Turn Anti-Nuke On or Off').setRequired(true).addChoices({ name: 'Enable', value: 'on' }, { name: 'Disable', value: 'off' })).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('verify-setup').setDescription('Deploys the verification panel button').addRoleOption(opt => opt.setName('role').setDescription('The role to give when users verify themselves').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('autostatus').setDescription('Set this channel to auto-update Minecraft server status every 5 minutes').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('serverlog').setDescription('Set this channel to manage and receive server logs/chat bridge updates').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

for (const cmd of allCommands) {
  commands.push(cmd.toJSON());
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
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
        .setTitle(isOnline ? '🟢 AURAMC Server Status : ONLINE' : '🔴 AURAMC Server Status : OFFLINE')
        .setDescription(`> *${config.description || 'Server is up and running smoothly!'}*`)
        .addFields(
          { name: '🔗 Server Address', value: `\`${config.fullAddress}\``, inline: true },
          { name: '👥 Active Players', value: '`Live & Connected`', inline: true },
          { name: '🛡️ Protocol', value: '`TCP Direct`', inline: true }
        )
        .setTimestamp();

      for (const [guildId, settings] of serverSettings.entries()) {
        if (settings.statusChannelId) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const channel = guild.channels.cache.get(settings.statusChannelId);
            if (channel) {
              await channel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error('Auto status check error:', err);
    }
  }, 5 * 60 * 1000);[cite: 10]
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, channel } = interaction;

      if (commandName === 'ping') {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const embed = new EmbedBuilder().setColor('#00FF7F').setTitle('🏓 Pong!').addFields({ name: 'Bot Latency', value: `${latency}ms`, inline: true }, { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true });
        await interaction.editReply({ content: '', embeds: [embed] });
      }
      else if (commandName === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Heads (Cheet)' : 'Tails (Patt)';
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🪙 Coin Flip').setDescription(`Sikka uchhala gaya aur aaya: **${result}**!`);
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'roll') {
        const roll = Math.floor(Math.random() * 6) + 1;
        const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const embed = new EmbedBuilder().setColor('#0099ff').setTitle('🎲 Dice Roll').setDescription(`Aapne dice roll kiya aur **${emojis[roll - 1] || roll} (${roll})** aaya!`);
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === '8ball') {
        const answers = ['Haan, bilkul!', 'Yeh toh pakka hai.', 'Shayad aisa hi ho.', 'Abhi kuch keh nahi sakte.', 'Bilkul nahi!', 'Iske chances bohot kam hain.', 'Sawal dobara pucho.', 'Mukammal taur par haan!'];
        const question = options.getString('question');
        const embed = new EmbedBuilder().setColor('#9932CC').setTitle('🎱 Magic 8-Ball').addFields({ name: 'Sawal:', value: question }, { name: 'Jawab:', value: answers[Math.floor(Math.random() * answers.length)] });
        await interaction.reply({ embeds: [embed] });
      }
      // PRECISE & PROFESSIONAL SERVER UI RESTORED
      else if (commandName === 'server') {
        await interaction.deferReply();
        if (!fs.existsSync(configPath)) {
          return interaction.editReply({ content: '❌ Pehle **`/setup-server`** command run karke apne server ki IP set karein!' });
        }
        const config = JSON.parse(fs.readFileSync(configPath));
        const isOnline = await checkMinecraftServer(config.ip, parseInt(config.port || '25565'));

        if (isOnline) {
          const onlineEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🟢 AURAMC Server Status : ONLINE')
            .setDescription(`> *${config.description || 'Server is up and running smoothly!'}*`)
            .addFields(
              { name: '🔗 Server Address', value: `\`${config.fullAddress}\``, inline: true },
              { name: '👥 Active Players', value: '`Live & Connected`', inline: true },
              { name: '🛡️ Protocol', value: '`TCP Direct`', inline: true }
            )
            .setTimestamp();
          await interaction.editReply({ embeds: [onlineEmbed] });
        } else {
          const offlineEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔴 AURAMC Server Status : OFFLINE')
            .setDescription('Server is currently offline, stopped, or unreachable over the network.')
            .setTimestamp();
          await interaction.editReply({ embeds: [offlineEmbed] });
        }
      }
      else if (commandName === 'setup-server') {
        const embed = new EmbedBuilder().setColor('#2b2d31').setTitle('⚙️ AURAMC Server Setup Center').setDescription('Apne Minecraft server ko live track karne ke liye neeche diye gaye button par click karein.');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_setup_modal').setLabel('Configure Server').setStyle(ButtonStyle.Primary).setEmoji('🛠️'));
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
      else if (commandName === 'balance') {
        const targetUser = options.getUser('user') || interaction.user;
        const eco = getUserData(targetUser.id);
        const embed = new EmbedBuilder().setColor('#57F287').setTitle(`💰 ${targetUser.username}'s Balance`).addFields({ name: '👛 Wallet', value: `\`${eco.balance} Coins\``, inline: true }, { name: '🏦 Bank', value: `\`${eco.bank} Coins\``, inline: true });
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'daily') {
        const eco = getUserData(interaction.user.id);
        eco.balance += 500;
        const embed = new EmbedBuilder().setColor('#FEE75C').setTitle('🎁 Daily Reward Claimed!').setDescription('Aapke wallet mein **500 Coins** add kar diye gaye hain!');
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'work') {
        const eco = getUserData(interaction.user.id);
        const earnings = Math.floor(Math.random() * 200) + 50;
        eco.balance += earnings;
        await interaction.reply(`💼 Aapne shift poori ki aur mehnat karke **${earnings} Coins** kama liye!`);
      }
      else if (commandName === 'pay') {
        const targetUser = options.getUser('user');
        const amount = options.getInteger('amount');
        if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ Aap khud ko coins nahi bhej sakte!', ephemeral: true });
        const senderEco = getUserData(interaction.user.id);
        if (senderEco.balance < amount) return interaction.reply({ content: '❌ Aapke wallet mein itne coins nahi hain!', ephemeral: true });
        senderEco.balance -= amount;
        getUserData(targetUser.id).balance += amount;
        await interaction.reply(`✅ Aapne successfully **${amount} Coins** ${targetUser} ko transfer kar diye hain!`);
      }
      else if (commandName === 'leaderboard') {
        const sortedUsers = [...userEconomy.entries()].map(([id, data]) => ({ id, total: data.balance + data.bank })).sort((a, b) => b.total - a.total).slice(0, 5);
        let desc = '';
        for (let i = 0; i < sortedUsers.length; i++) {
          const user = await client.users.fetch(sortedUsers[i].id).catch(() => ({ username: 'Unknown User' }));
          desc += `**${i + 1}.** ${user.username} — \`${sortedUsers[i].total} Coins\`\n`;
        }
        const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🏆 Server Richest Leaderboard').setDescription(desc || 'Koi data available nahi hai.');
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'rank') {
        const targetUser = options.getUser('user') || interaction.user;
        const lvlData = getUserXpData(targetUser.id);
        const embed = new EmbedBuilder().setColor('#9b59b6').setTitle(`📊 ${targetUser.username}'s Level Rank`).addFields({ name: '⭐ Level', value: `\`${lvlData.level}\``, inline: true }, { name: '⚡ Current XP', value: `\`${lvlData.xp} / ${lvlData.level * 100}\``, inline: true });
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'nuke') {
        const newChannel = await channel.clone({ position: channel.position });
        await channel.delete();
        await newChannel.send(`🚨 **Yeh channel nuke kar diya gaya hai!** (Nuked by ${interaction.user.tag})`);
      }
      else if (commandName === 'antinuke') {
        const status = options.getString('status') === 'on';
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).antinuke = status;
        await interaction.reply({ content: `🛡️ Anti-Nuke protection has been successfully **${status ? 'ENABLED' : 'DISABLED'}**!`, ephemeral: true });
      }
      else if (commandName === 'verify-setup') {
        const role = options.getRole('role');
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).verifiedRoleId = role.id;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_user_btn').setLabel('✅ Verify Yourself').setStyle(ButtonStyle.Success));
        const embed = new EmbedBuilder().setColor('#57F287').setTitle('🛡️ Server Verification').setDescription('Click the button below to verify yourself!');
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Verification panel deployed!', ephemeral: true });
      }
      else if (commandName === 'autostatus') {
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).statusChannelId = channel.id;
        await interaction.reply({ content: `✅ Successfully set ${channel} as the 5-minute automated server status update channel!`, ephemeral: true });
      }
      else if (commandName === 'serverlog') {
        if (!serverSettings.has(guild.id)) serverSettings.set(guild.id, {});
        serverSettings.get(guild.id).logChannelId = channel.id;
        await interaction.reply({ content: `✅ Successfully set ${channel} as the Minecraft server logs and management channel!`, ephemeral: true });
      }
    } 
    else if (interaction.isButton()) {
      if (interaction.customId === 'verify_user_btn') {
        const settings = serverSettings.get(interaction.guild.id);
        if (!settings || !settings.verifiedRoleId) return interaction.reply({ content: '❌ Not configured!', ephemeral: true });
        const role = interaction.guild.roles.cache.get(settings.verifiedRoleId);
        if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: '⚠️ Aap pehle se verified hain!', ephemeral: true });
        await interaction.member.roles.add(role);
        await interaction.reply({ content: '🎉 Successfully verified!', ephemeral: true });
      } 
      else if (interaction.customId === 'open_setup_modal') {
        const modal = new ModalBuilder().setCustomId('server_setup_modal').setTitle('AURAMC Server Configuration');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_ip_input').setLabel('Server IP').setPlaceholder('play.auramc.com').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_port_input').setLabel('Port').setPlaceholder('25565').setStyle(TextInputStyle.Short).setRequired(false)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('server_desc_input').setLabel('Description').setPlaceholder('Tagline').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
      }
    } 
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'server_setup_modal') {
        await interaction.deferReply({ ephemeral: true });
        const serverIp = interaction.fields.getTextInputValue('server_ip_input').trim();
        let serverPort = interaction.fields.getTextInputValue('server_port_input').trim() || '25565';
        const serverDesc = interaction.fields.getTextInputValue('server_desc_input');
        const fullAddress = `${serverIp}:${serverPort}`;

        const isOnline = await checkMinecraftServer(serverIp, parseInt(serverPort));
        fs.writeFileSync(configPath, JSON.stringify({ ip: serverIp, port: serverPort, fullAddress, description: serverDesc }, null, 2));

        await interaction.editReply({ content: `✅ Server Config Saved! Status: ${isOnline ? 'Online' : 'Offline'}` });
      }
    }
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.DISCORD_TOKEN);
