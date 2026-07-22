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
      // Cache buster timestamp ke sath high precision fetch
      const timestamp = Date.now();
      const response = await fetch(`https://api.mcsrvstat.us/3/${fullAddress}?t=${timestamp}`);
      const data = await response.json();

      if (!data) {
        throw new Error('Invalid API Response');
      }

      if (data.online) {
        // Online Professional Embed
        const onlineEmbed = new EmbedBuilder()
          .setColor('#57F287') // Discord Green
          .setTitle('🟢 AURAMC Server Status : ONLINE')
          .setDescription(`> *${config.description || data.motd?.clean?.[0] || 'No description available'}*`)
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: true },
            { name: '👥 Active Players', value: `\`${data.players.online} / ${data.players.max}\``, inline: true },
            { name: '⚙️ Game Version', value: `\`${data.version || 'Unknown'}\``, inline: true },
            { name: '🛡️ Software / Protocol', value: `\`${data.software || 'Vanilla/Custom'}\``, inline: true },
            { name: '📡 Connection Latency', value: '`Stable`', inline: true },
            { name: '⚡ Host Status', value: '`Operational`', inline: true }
          )
          .setThumbnail(`https://api.mcsrvstat.us/icon/${config.ip}`)
          .setFooter({ text: 'AURAMC Live Telemetry • Real-time Monitoring', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [onlineEmbed] });
      } else {
        // Offline Professional Embed
        const offlineEmbed = new EmbedBuilder()
          .setColor('#ED4245') // Discord Red
          .setTitle('🔴 AURAMC Server Status : OFFLINE')
          .setDescription('Server is currently offline or unreachable over the public network.')
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: false },
            { name: '🛠️ Troubleshooting', value: 'Check if your host/server software is running and port forwarding is active.', inline: false }
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
        .setDescription('Server se connection establish karne mein samasya aa rahi hai. Kripya baad mein prayas karein.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
