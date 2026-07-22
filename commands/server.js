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

    // Check karna ki server setup kiya gaya hai ya nahi
    if (!fs.existsSync(configPath)) {
      return interaction.editReply({ 
        content: '❌ Pehle `/setup-server` command ka use karke server ki IP set karein!' 
      });
    }

    const rawData = fs.readFileSync(configPath);
    const config = JSON.parse(rawData);
    const serverIp = config.ip;

    try {
      const response = await fetch(`https://api.mcsrvstat.us/3/${serverIp}`);
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')
        .setTitle('⛏️ AURAMC Server Live Status')
        .setDescription(config.description || 'No description provided')
        .addFields(
          { name: 'Server IP', value: `\`${serverIp}\``, inline: false },
          { name: 'Status', value: data.online ? '🟢 Online' : '🔴 Offline', inline: true },
          { name: 'Players Online', value: data.online ? `${data.players.online} / ${data.players.max}` : 'N/A', inline: true },
          { name: 'Version', value: data.version || 'Unknown', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Server status fetch karne mein error aa gaya.' });
    }
  },
};
