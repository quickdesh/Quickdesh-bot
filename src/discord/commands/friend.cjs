const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('friend')
        .setDescription('Send a friend request to the given player')
        .addStringOption( option =>
            option.setName('player')
                  .setDescription("Username of player")
                  .setRequired(true)
            )
    }
