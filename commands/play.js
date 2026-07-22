const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play 24/7 Lo-Fi and Chill Radio Stations instantly')
    .addStringOption(option =>
      option.setName('station')
        .setDescription('Choose a music station')
        .setRequired(true)
        .addChoices(
          { name: 'Lo-Fi Beats (Chill/Study)', value: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
          { name: 'Synthwave Radio', value: 'https://stream.zeno.fm/ep3rmqbcwy8uv' },
          { name: 'Relaxing Piano', value: 'https://stream.zeno.fm/004z6vtwgg8uv' }
        )),
  
  async execute(interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Aapko pehle kisi Voice Channel se connect hona padega!' });
    }

    const stationUrl = interaction.options.getString('station');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const resource = createAudioResource(stationUrl);
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);

      await interaction.editReply({ content: `🎶 Non-stop Radio station successfully connected and playing!` });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Radio play karne mein kuch error aa gaya.' });
    }
  },
};
