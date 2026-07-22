const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from a direct link')
    .addStringOption(option =>
      option.setName('link')
        .setDescription('Direct YouTube or Audio stream URL')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Pehle kisi Voice Channel se connect ho jao!' });
    }

    const url = interaction.options.getString('link');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // Stream fetch karna play-dl ke through
      let streamData = await play.stream(url);
      let resource = createAudioResource(streamData.stream, { 
        inputType: streamData.type 
      });

      let player = createAudioPlayer();
      player.play(resource);
      connection.subscribe(player);

      await interaction.editReply({ content: `🎶 Music successfully play ho raha hai!` });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Song play karne mein error aaya. Kripya koi aur valid direct link try karein.' });
    }
  },
};
