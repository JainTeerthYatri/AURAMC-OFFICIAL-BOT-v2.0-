const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play non-stop chill lo-fi music instantly')
    .addStringOption(option =>
      option.setName('genre')
        .setDescription('Select music type')
        .setRequired(true)
        .addChoices(
          { name: 'Lo-Fi Chill Beats', value: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
          { name: 'Synthwave Radio', value: 'https://stream.zeno.fm/ep3rmqbcwy8uv' }
        )),
  
  async execute(interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Pehle kisi Voice Channel se connect ho jao bhai!' });
    }

    const streamUrl = interaction.options.getString('genre');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const resource = createAudioResource(streamUrl);
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);

      await interaction.editReply({ content: '🎶 Music successfully connect ho gaya hai aur play ho raha hai!' });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Kuch gadbad ho gayi, dubara try karo.' });
    }
  },
};
