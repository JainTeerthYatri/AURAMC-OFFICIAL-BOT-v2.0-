const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'server-config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Display professional live status of the AURAMC server'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!fs.existsSync(configPath)) {
      return interaction.editReply({ 
        content: '❌ Pehle **`/setup-server`** command run karke apne server ki IP set karein!' 
      });
    }

    const rawData = fs.readFileSync(configPath);
    const config = JSON.parse(rawData);
    const fullAddress = config.fullAddress || `${config.ip}:${config.port || '25565'}`;

    try {
      // Unique random string aur timestamp taaki API caching 100% bypass ho jaye
      const cacheBuster = `nocache=${Date.now()}_${Math.random()}`;
      const url = `https://api.mcsrvstat.us/3/${fullAddress}?${cacheBuster}`;

      // Force fetch without cache headers
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      const data = await response.json();

      if (!data) {
        throw new Error('Invalid API Response');
      }

      if (data.online) {
        const onlineEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🟢 AURAMC Server Status : ONLINE')
          .setDescription(`> *${config.description || data.motd?.clean?.[0] || 'No description available'}*`)
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: true },
            { name: '👥 Active Players', value: `\`${data.players.online} / ${data.players.max}\``, inline: true },
            { name: '⚙️ Game Version', value: `\`${data.version || 'Unknown'}\``, inline: true },
            { name: '🛡️ Software', value: `\`${data.software || 'Vanilla/Custom'}\``, inline: true }
          )
          .setThumbnail(`https://api.mcsrvstat.us/icon/${config.ip}`)
          .setFooter({ text: 'AURAMC Live Telemetry • Real-time Monitoring', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [onlineEmbed] });
      } else {
        const offlineEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🔴 AURAMC Server Status : OFFLINE')
          .setDescription('Server is currently offline or unreachable over the public network.')
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: false },
            { name: '🛠️ Troubleshooting', value: 'Check if your server software is running and accessible.', inline: false }
          )
          .setFooter({ text: 'AURAMC Live Telemetry • Real-time Monitoring', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [offlineEmbed] });
      }

    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('⚠️ Status Check Warning')
        .setDescription('Server se connection establish karne mein samasya aa rahi hai.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
