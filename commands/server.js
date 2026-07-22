const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Check AURAMC live server status'),

  async execute(interaction) {
    await interaction.deferReply();

    const serverIp = 'play.yourminecraftserver.com'; // Yahan apna Minecraft server IP daalein

    try {
      const response = await fetch(`https://api.mcsrvstat.us/3/${serverIp}`);
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')
        .setTitle('⛏️ AURAMC Server Status')
        .addFields(
          { name: 'Server IP', value: `\`${serverIp}\``, inline: false },
          { name: 'Status', value: data.online ? '🟢 Online' : '🔴 Offline', inline: true },
          { name: 'Players', value: data.online ? `${data.players.online} / ${data.players.max}` : 'N/A', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Server status fetch karne mein error aa gaya.' });
    }
  },
};
