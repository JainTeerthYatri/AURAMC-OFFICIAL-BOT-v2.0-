const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const answers = [
  'Haan, bilkul!',
  'Yeh toh pakka hai.',
  'Shayad aisa hi ho.',
  'Abhi kuch keh nahi sakte.',
  'Bilkul nahi!',
  'Iske chances bohot kam hain.',
  'Sawal dobara pucho.',
  'Mukammal taur par haan!'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Apna sawal puchiye')
        .setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

    const embed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Sawal:', value: question },
        { name: 'Jawab:', value: randomAnswer }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
