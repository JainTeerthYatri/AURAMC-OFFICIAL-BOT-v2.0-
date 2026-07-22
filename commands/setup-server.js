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
    .setDescription('Open the interactive AURAMC Server Setup Panel'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('⚙️ AURAMC Server Setup Panel')
      .setDescription('Neeche diye gaye button par click karke apne server ki IP update karein!')
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_setup_modal')
          .setLabel('Configure Server IP')
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
        .setLabel('Minecraft Server IP')
        .setPlaceholder('e.g., play.auramc.com')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('server_desc_input')
        .setLabel('Server Description / MOTD')
        .setPlaceholder('Enter server short description...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ipInput),
        new ActionRowBuilder().addComponents(descInput)
      );

      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    if (interaction.customId === 'server_setup_modal') {
      const serverIp = interaction.fields.getTextInputValue('server_ip_input');
      const serverDesc = interaction.fields.getTextInputValue('server_desc_input');

      // Data ko JSON file mein save karna
      const configData = { ip: serverIp, description: serverDesc };
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Server Setup Saved Successfully!')
        .addFields(
          { name: 'Saved Server IP', value: `\`${serverIp}\``, inline: false },
          { name: 'Description', value: serverDesc, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
  }
};
