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
    const fullAddress = config.fullAddress || `${config.ip}:${config.port || '25565'}`;

    try {
      const response = await fetch(`https://api.mcsrvstat.us/3/${fullAddress}`);
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')
        .setTitle('⛏️ AURAMC Server Live Status')
        .setDescription(config.description || 'No description provided')
        .addFields(
          { name: 'Server Address', value: `\`${fullAddress}\``, inline: false },
          { name: 'Status', value: data.online ? '🟢 Online' : '🔴 Offline / Unreachable', inline: true },
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
