const { Client, GatewayIntentBits, Collection, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Express server (Render/UptimeRobot ke liye zaroori hai taaki bot offline na ho)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('AURAMC Bot 2 is Online and Running!');
});

app.listen(PORT, () => {
  console.log(`Web server is running on port ${PORT}`);
});

// Discord Client Setup
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

// ================= IN-MEMORY DATABASES & CONFIGS =================
const userEconomy = new Map(); // userId -> { balance, bank }
const userXp = new Map();      // userId -> { xp, level }
const serverSettings = new Map(); // guildId -> { antinuke: boolean, verifiedRoleId: string }

// Helper function for Economy data
function getUserData(userId) {
  if (!userEconomy.has(userId)) {
    userEconomy.set(userId, { balance: 500, bank: 1000 });
  }
  return userEconomy.get(userId);
}

// Helper function for Leveling data
function getUserXpData(userId) {
  if (!userXp.has(userId)) {
    userXp.set(userId, { xp: 0, level: 1 });
  }
  return userXp.get(userId);
}

// 1. Commands folder se purani commands load karna (server, setup-server, ping, coinflip, roll, 8ball)
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// 2. Nayi Advanced Commands ko builder array mein add karna
const extraCommands = [
  // --- Economy Commands ---
  new SlashCommandBuilder().setName('balance').setDescription('Check your wallet and bank balance').addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily free coins reward'),
  new SlashCommandBuilder().setName('work').setDescription('Do a quick shift to earn some coins'),
  new SlashCommandBuilder().setName('pay').setDescription('Transfer coins to another user').addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Amount to pay').setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Check the richest players in the server'),

  // --- Leveling Command ---
  new SlashCommandBuilder().setName('rank').setDescription('Check your current chat rank and XP').addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  // --- Admin Security & Management Commands ---
  new SlashCommandBuilder().setName('nuke').setDescription('Deletes and clones the current channel to wipe all messages instantly').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Enable or disable anti-nuke server protection')
    .addStringOption(opt => 
      opt.setName('status')
        .setDescription('Turn Anti-Nuke On or Off')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'on' },
          { name: 'Disable', value: 'off' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('verify-setup')
    .setDescription('Deploys the verification panel button')
    .addRoleOption(opt => 
      opt.setName('role')
        .setDescription('The role to give when users verify themselves')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

for (const cmd of extraCommands) {
  commands.push(cmd.toJSON());
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// ================= ANTI-NUKE SECURITY LISTENERS =================
const recentDeletes = new Map();

client.on('channelDelete', async channel => {
  const settings = serverSettings.get(channel.guild.id);
  if (!settings || !settings.antinuke) return;

  const guildId = channel.guild.id;
  const now = Date.now();
  if (!recentDeletes.has(guildId)) recentDeletes.set(guildId, []);
  
  const timestamps = recentDeletes.get(guildId);
  timestamps.push(now);
  
  // Clean old entries (older than 10 seconds)
  const filtered = timestamps.filter(t => now - t < 10000);
  recentDeletes.set(guildId, filtered);

  // If more than 3 channels deleted within 10 seconds, trigger anti-nuke alert
  if (filtered.length >= 3) {
    const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }); // Channel Delete log
    const logEntry = auditLogs.entries.first();
    if (logEntry) {
      const executor = logEntry.executor;
      const member = await channel.guild.members.fetch(executor.id).catch(() => null);
      if (member && member.bannable) {
        await member.ban({ reason: 'Anti-Nuke Triggered: Mass channel deletion detected!' });
        const systemChannel = channel.guild.systemChannel;
        if (systemChannel) {
          systemChannel.send(`🚨 **ANTI-NUKE ACTIVATED!** ${executor.tag} ko mass channel delete karne ke karan server se ban kar diya gaya hai!`);
        }
      }
    }
  }
});

// ================= MESSAGE EVENT (Chat Leveling XP) =================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const data = getUserXpData(userId);
  data.xp += Math.floor(Math.random() * 10) + 5;

  const requiredXp = data.level * 100;
  if (data.xp >= requiredXp) {
    data.level += 1;
    data.xp = 0;
    message.channel.send(`🎉 Mubarak ho ${message.author}! Aapka level badh kar **Level ${data.level}** ho gaya hai! 🚀`).catch(() => {});
  }
});

// ================= INTERACTION HANDLER =================
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild } = interaction;

      const command = client.commands.get(commandName);
      if (command) {
        await command.execute(interaction);
        return;
      }

      if (commandName === 'balance') {
        const targetUser = options.getUser('user') || interaction.user;
        const eco = getUserData(targetUser.id);
        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle(`💰 ${targetUser.username}'s Balance`)
          .addFields(
            { name: '👛 Wallet', value: `\`${eco.balance} Coins\``, inline: true },
            { name: '🏦 Bank', value: `\`${eco.bank} Coins\``, inline: true }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'daily') {
        const eco = getUserData(interaction.user.id);
        const reward = 500;
        eco.balance += reward;
        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setTitle('🎁 Daily Reward Claimed!')
          .setDescription(`Aapke wallet mein **${reward} Coins** add kar diye gaye hain!`)
          .setTimestamp();
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
        if (targetUser.id === interaction.user.id) {
          return interaction.reply({ content: '❌ Aap khud ko coins nahi bhej sakte!', ephemeral: true });
        }
        const senderEco = getUserData(interaction.user.id);
        if (senderEco.balance < amount) {
          return interaction.reply({ content: '❌ Aapke wallet mein itne coins nahi hain!', ephemeral: true });
        }
        const receiverEco = getUserData(targetUser.id);
        senderEco.balance -= amount;
        receiverEco.balance += amount;
        await interaction.reply(`✅ Aapne successfully **${amount} Coins** ${targetUser} ko transfer kar diye hain!`);
      }
      else if (commandName === 'leaderboard') {
        const sortedUsers = [...userEconomy.entries()]
          .map(([id, data]) => ({ id, total: data.balance + data.bank }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        let desc = '';
        for (let i = 0; i < sortedUsers.length; i++) {
          const user = await client.users.fetch(sortedUsers[i].id).catch(() => ({ username: 'Unknown User' }));
          desc += `**${i + 1}.** ${user.username} — \`${sortedUsers[i].total} Coins\`\n`;
        }

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🏆 Server Richest Leaderboard')
          .setDescription(desc || 'Koi data available nahi hai abhi.')
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'rank') {
        const targetUser = options.getUser('user') || interaction.user;
        const lvlData = getUserXpData(targetUser.id);
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle(`📊 ${targetUser.username}'s Level Rank`)
          .addFields(
            { name: '⭐ Level', value: `\`${lvlData.level}\``, inline: true },
            { name: '⚡ Current XP', value: `\`${lvlData.xp} / ${lvlData.level * 100}\``, inline: true }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
      else if (commandName === 'nuke') {
        const channel = interaction.channel;
        await interaction.reply({ content: '⚠️ Channel nuke kiya ja raha hai...', ephemeral: true });
        
        try {
          const position = channel.position;
          const newChannel = await channel.clone({ position: position });
          await channel.delete();
          await newChannel.send(`🚨 **Yeh channel nuke kar diya gaya hai!** Clean slate fresh channel ready hai. (Nuked by ${interaction.user.tag})`);
        } catch (err) {
          console.error(err);
        }
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

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('verify_user_btn')
            .setLabel('✅ Verify Yourself')
            .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🛡️ Server Verification')
          .setDescription('Click the button below to verify yourself and gain full access to the server!');

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Verification panel successfully deployed in this channel!', ephemeral: true });
      }

    } 
    else if (interaction.isButton()) {
      if (interaction.customId === 'verify_user_btn') {
        const settings = serverSettings.get(interaction.guild.id);
        if (!settings || !settings.verifiedRoleId) {
          return interaction.reply({ content: '❌ Verification role is not configured by admins yet!', ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(settings.verifiedRoleId);
        if (!role) {
          return interaction.reply({ content: '❌ Configured verification role no longer exists!', ephemeral: true });
        }

        const member = interaction.member;
        if (member.roles.cache.has(role.id)) {
          return interaction.reply({ content: '⚠️ Aap pehle se hi verified hain!', ephemeral: true });
        }

        try {
          await member.roles.add(role);
          await interaction.reply({ content: '🎉 Congratulations! Aap successfully verify ho chuke hain aur aapko role mil gaya hai.', ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: '❌ Role assign karne mein error aa gaya. Bot ki role hierarchy check karein.', ephemeral: true });
        }
      } else {
        const command = client.commands.get('setup-server');
        if (command && command.handleButton) {
          await command.handleButton(interaction);
        }
      }
    } 
    else if (interaction.isModalSubmit()) {
      const command = client.commands.get('setup-server');
      if (command && command.handleModal) {
        await command.handleModal(interaction);
      }
    }
  } catch (error) {
    console.error(error);
    const errorMessage = { content: 'Interaction execute karne mein koi error aa gaya!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Bot Login
client.login(process.env.DISCORD_TOKEN);
