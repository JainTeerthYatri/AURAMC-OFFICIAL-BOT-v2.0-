const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const configPath = path.join(__dirname, '..', 'server-config.json');

// Direct TCP socket se server check karne ka function (No Caching, 100% Real-time)
function checkMinecraftServer(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true); // Server is Online
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false); // Timeout -> Offline
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false); // Error/Refused -> Offline
    });

    socket.connect(port, host);
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Check professional live status of the AURAMC server'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!fs.existsSync(configPath)) {
      return interaction.editReply({ 
        content: '❌ Pehle **`/setup-server`** command run karke apne server ki IP set karein!' 
      });
    }

    const rawData = fs.readFileSync(configPath);
    const config = JSON.parse(rawData);
    const host = config.ip;
    const port = parseInt(config.port || '25565');
    const fullAddress = `${host}:${port}`;

    try {
      // Direct network ping (Bina kisi API ke)
      const isOnline = await checkMinecraftServer(host, port);

      if (isOnline) {
        const onlineEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('🟢 AURAMC Server Status : ONLINE')
          .setDescription(`> *${config.description || 'Server is up and running!'}*`)
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: true },
            { name: '📡 Connection Status', value: '`Reachable / Open`', inline: true },
            { name: '⚡ Host State', value: '`Operational`', inline: true }
          )
          .setFooter({ text: 'AURAMC Direct Telemetry • Real-time TCP Ping', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [onlineEmbed] });
      } else {
        const offlineEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🔴 AURAMC Server Status : OFFLINE')
          .setDescription('Server is currently offline, stopped, or unreachable.')
          .addFields(
            { name: '🔗 Server Address', value: `\`${fullAddress}\``, inline: false },
            { name: '🛠️ Note', value: 'TCP connection failed. Server band hai ya port band hai.', inline: false }
          )
          .setFooter({ text: 'AURAMC Direct Telemetry • Real-time TCP Ping', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [offlineEmbed] });
      }

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Status check karne mein koi technical error aa gaya.' });
    }
  },
};
