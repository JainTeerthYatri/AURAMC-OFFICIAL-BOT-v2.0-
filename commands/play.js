const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music instantly')
    .addStringOption(option =>
      option.setName('song')
        .setDescription('SoundCloud link or Song name')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Aapko pehle kisi Voice Channel se connect hona padega!' });
    }

    const query = interaction.options.getString('song');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // YouTube ke bajaye SoundCloud search ya direct stream use karna zyada fast hota hai
      let streamData = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
      
      if (!streamData || streamData.length === 0) {
        return interaction.editReply({ content: '❌ Koi song nahi mila! Kripya SoundCloud ka direct link dein.' });
      }

      const songUrl = streamData[0].url;
      const stream = await play.stream(songUrl);
      
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);

      await interaction.editReply({ content: f`🎶 Now Playing: **${streamData[0].title}**` });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Song play karne mein error aa gaya. Kripya doosra song try karein.' });
    }
  },
};
