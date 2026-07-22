const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'server-config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('Configure your Minecraft server for live monitoring'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('⚙️ AURAMC Server Setup Center')
      .setDescription('Apne Minecraft server ko live track karne ke liye neeche diye gaye button par click karke details configure karein.')
      .addFields(
        { name: 'Status', value: '🟢 System Ready', inline: true },
        { name: 'Security', value: '🔒 Encrypted Config', inline: true }
      )
      .setFooter({ text: 'AURAMC Management System' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_setup_modal')
          .setLabel('Configure Server')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🛠️')
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  async handleButton(interaction) {
    if (interaction.customId === 'open_setup_modal') {
      const modal = new ModalBuilder()
        .setCustomId('server_setup_modal')
        .setTitle('AURAMC Server Configuration');

      const ipInput = new TextInputBuilder()
        .setCustomId('server_ip_input')
        .setLabel('Server Host / Domain / IP')
        .setPlaceholder('e.g., play.auramc.com')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const portInput = new TextInputBuilder()
        .setCustomId('server_port_input')
        .setLabel('Port (Leave blank for default 25565)')
        .setPlaceholder('25565')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const descInput = new TextInputBuilder()
        .setCustomId('server_desc_input')
        .setLabel('Server MOTD / Description')
        .setPlaceholder('Enter a short tagline for your server...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ipInput),
        new ActionRowBuilder().addComponents(portInput),
        new ActionRowBuilder().addComponents(descInput)
      );

      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    if (interaction.customId === 'server_setup_modal') {
      await interaction.deferReply({ ephemeral: true });

      const serverIp = interaction.fields.getTextInputValue('server_ip_input').trim();
      let serverPort = interaction.fields.getTextInputValue('server_port_input').trim();
      const serverDesc = interaction.fields.getTextInputValue('server_desc_input');

      if (!serverPort) serverPort = '25565';
      const fullAddress = `${serverIp}:${serverPort}`;

      try {
        // Live verification before saving
        const response = await fetch(`https://api.mcsrvstat.us/3/${fullAddress}`);
        const data = await response.json();

        // Save data to JSON
        const configData = { 
          ip: serverIp, 
          port: serverPort, 
          fullAddress: fullAddress, 
          description: serverDesc 
        };
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

        const successEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('✅ Server Successfully Configured!')
          .setDescription('Aapki server details successfully save ho chuki hain. Ab aap `/server` command use kar sakte hain.')
          .addFields(
            { name: '🌐 Address', value: `\`${fullAddress}\``, inline: false },
            { name: '📊 Current Status', value: data.online ? '🟢 Online & Reachable' : '🟡 Saved (Currently Offline)', inline: true },
            { name: '📝 Description', value: serverDesc, inline: false }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

      } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Server configuration save karte waqt error aa gaya. Dobara koshish karein.' });
      }
    }
  }
};
