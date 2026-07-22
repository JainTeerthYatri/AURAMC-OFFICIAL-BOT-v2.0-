const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin (Heads or Tails)'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads (Cheet)' : 'Tails (Patt)';
    
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🪙 Coin Flip')
      .setDescription(`Sikka uchhala gaya aur aaya: **${result}**!`);

    await interaction.reply({ embeds: [embed] });
  },
};
