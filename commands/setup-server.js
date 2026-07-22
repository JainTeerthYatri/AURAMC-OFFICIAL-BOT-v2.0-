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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('Open the interactive AURAMC Server Setup Panel'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('⚙️ AURAMC Server Setup Panel')
      .setDescription('Neeche diye gaye button par click karke apne server ki details update karein!')
      .addFields(
        { name: 'Status', value: '🟢 Panel Active', inline: true },
        { name: 'Managed By', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_setup_modal')
          .setLabel('Configure Server Info')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🛠️')
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  // Jab user button par click karega toh Modal (Popup Form) khulega
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
        .setPlaceholder('Enter your server short description...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ipInput),
        new ActionRowBuilder().addComponents(descInput)
      );

      await interaction.showModal(modal);
    }
  },

  // Jab user form (Modal) submit karega
  async handleModal(interaction) {
    if (interaction.customId === 'server_setup_modal') {
      const serverIp = interaction.fields.getTextInputValue('server_ip_input');
      const serverDesc = interaction.fields.getTextInputValue('server_desc_input');

      // Aap yahan chahe toh ise database ya file mein save kar sakte hain
      // Filhal hum success message dikha rahe hain

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Server Setup Saved Successfully!')
        .addFields(
          { name: 'Server IP', value: `\`${serverIp}\``, inline: false },
          { name: 'Description', value: serverDesc, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
  }
};
