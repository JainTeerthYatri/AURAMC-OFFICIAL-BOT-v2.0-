const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('AURAMC Official Bot is live and running!');
});

app.listen(PORT, () => {
  console.log(`Web server is listening on port ${PORT}`);
});

try {
  require('dotenv').config();
} catch (e) {}

const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const commandsArray = [];

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commandsArray.push(command.data.toJSON());
    }
  }
}

// --- XP System Storage (Simple memory-based) ---
const levels = {};

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag} (v2.0)!`);

  if (process.env.BOT_TOKEN && process.env.CLIENT_ID && commandsArray.length > 0) {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
      console.log('Refreshing application (/) commands...');
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsArray },
      );
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  }
});

// XP & Leveling Logic on Every Message
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  if (!levels[userId]) {
    levels[userId] = { xp: 0, level: 1 };
  }

  // Har message par random XP dena (e.g., 15 to 25 XP)
  const xpToAdd = Math.floor(Math.random() * 11) + 15;
  levels[userId].xp += xpToAdd;

  // Level up requirement formula: Level * 100 XP
  const neededXp = levels[userId].level * 100;
  if (levels[userId].xp >= neededXp) {
    levels[userId].level += 1;
    levels[userId].xp = 0;
    message.channel.endswith?.();
    message.channel.send(`🎉 Badhai ho ${message.author}, aapka level badh kar **Level ${levels[userId].level}** ho gaya hai!`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
  }
});

if (process.env.BOT_TOKEN) {
  client.login(process.env.BOT_TOKEN);
}
