const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const questions = [
  { q: "Discord kis saal mein launch hua tha?", a: "2015" },
  { q: "JavaScript kis type ki language hai?", a: "Programming" },
  { q: "Minecraft ka sabse pehla version kab aaya tha?", a: "2009" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Play a quick tech/gaming trivia question!'),
  async execute(interaction) {
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🧠 Quick Trivia')
      .setDescription(`**Question:** ${randomQ.q}\n\n*Hint: Answer ek word mein hai! (Reply mein likho)*`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', m => {
      if (m.content.toLowerCase() === randomQ.a.toLowerCase()) {
        m.reply('🎉 Sahi jawab! Aap jeet gaye.');
      } else {
        m.reply(`❌ Galat jawab! Sahi jawab tha: **${randomQ.a}**`);
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: '⏰ Time khatam ho gaya! Aapne jawab nahi diya.', ephemeral: true });
      }
    });
  },
};
