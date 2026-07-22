const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'server-config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Check AURAMC live server status'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!fs.existsSync(configPath)) {
      return interaction.editReply({ 
        content: '❌ Pehle `/setup-server` command ka use karke server ki IP aur Port set karein!' 
      });
    }

    const rawData = fs.readFileSync(configPath);
    const config = JSON.parse(rawData);
    const serverIp = config.ip;
    const serverPort = config.port || '25565';

    try {
      // Ab hum mcapi.us use kar rahe hain jo bohot fast aur accurate hai
      const response = await fetch(`https://mcapi.us/server/status?ip=${serverIp}&port=${serverPort}`);
      const data = await response.json();

      // Agar API se connection mein koi dikkat aaye
      if (!data || typeof data.online === 'undefined') {
        return interaction.editReply({ content: '❌ Server se data fetch nahi ho paya. IP ya Port check karein.' });
      }

      const embed = new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')
        .setTitle('⛏️ AURAMC Server Live Status')
        .setDescription(config.description || 'No description provided')
        .addFields(
          { name: 'Server Address', value: `\`${serverIp}:${serverPort}\``, inline: false },
          { name: 'Status', value: data.online ? '🟢 Online' : '🔴 Offline / Unreachable', inline: true },
          { name: 'Players Online', value: data.online ? `${data.players.now} / ${data.players.max}` : 'N/A', inline: true },
          { name: 'Version', value: data.server?.name || 'Unknown', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Server status check karte waqt koi error aa gaya.' });
    }
  },
};
