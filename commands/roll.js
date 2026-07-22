const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a 6-sided dice'),

  async execute(interaction) {
    const roll = Math.floor(Math.random() * 6) + 1;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎲 Dice Roll')
      .setDescription(`Aapne dice roll kiya aur **${numberToEmoji(roll)} (${roll})** aaya!`);

    await interaction.reply({ embeds: [embed] });
  },
};

function numberToEmoji(num) {
  const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return emojis[num - 1] || num;
}
