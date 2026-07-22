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
      .setDescription('Neeche diye gaye button par click karke apne server ki IP aur Port set karein!')
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_setup_modal')
          .setLabel('Configure Server Details')
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
        .setLabel('Minecraft Server IP (Domain/IP)')
        .setPlaceholder('e.g., play.hypixel.net')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const portInput = new TextInputBuilder()
        .setCustomId('server_port_input')
        .setLabel('Server Port (Default: 25565)')
        .setPlaceholder('25565')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const descInput = new TextInputBuilder()
        .setCustomId('server_desc_input')
        .setLabel('Server Description / MOTD')
        .setPlaceholder('Enter server short description...')
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

      // Agar port nahi bhara toh default 25565 maan lo
      if (!serverPort) serverPort = '25565';

      // API check ke liye full address (IP:Port) banana
      const fullAddress = `${serverIp}:${serverPort}`;

      try {
        // Test karne ke liye API call karna ki server exist karta hai ya nahi
        const response = await fetch(`https://api.mcsrvstat.us/3/${fullAddress}`);
        const data = await response.json();

        // Agar server ki IP galat hai ya domain exist nahi karta
        if (!data.online && !data.ip) {
          return interaction.editReply({ 
            content: `❌ **Server Not Found!** \`${fullAddress}\` naam ka koi valid Minecraft server exist nahi karta ya offline hai. Kripya sahi IP aur Port daalein.` 
          });
        }

        // Data ko JSON file mein save karna
        const configData = { 
          ip: serverIp, 
          port: serverPort, 
          fullAddress: fullAddress, 
          description: serverDesc 
        };
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Server Setup Verified & Saved!')
          .setDescription('Server successfully online paya gaya aur save ho gaya hai.')
          .addFields(
            { name: 'Server Address', value: `\`${fullAddress}\``, inline: false },
            { name: 'Status', value: data.online ? '🟢 Online' : '🔴 Offline (But IP exists)', inline: true },
            { name: 'Description', value: serverDesc, inline: false }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

      } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Server verify karte waqt network error aa gaya. Dobara koshish karein.' });
      }
    }
  }
};
