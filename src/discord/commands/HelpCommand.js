const DiscordCommand = require('../../contracts/DiscordCommand')

const { version } = require('../../../package.json')

class HelpCommand extends DiscordCommand {
  constructor(discord) {
    super(discord)

    this.name = 'help'
    this.aliases = ['h', 'info']
    this.description = 'Shows this help menu'
  }

  onCommand(message) {
    let discordCommands = []

    this.discord.messageHandler.command.commands.forEach(command => {
      discordCommands.push(`\`${command.name}\`: ${command.description}`)
    })

   

    message.channel.send({
      embeds: [
        {
        title: 'Help',
        description: ['`< >` = Required arguments', '`[ ]` = Optional arguments'].join('\n'),
        fields: [
          {
              name: 'Discord Commands',
              value: discordCommands.join('\n\n')
            },
            
            {
              name: `Info`,
              value: [
                `Prefix: \`${this.discord.app.config.discord.prefix}\``,
                `Guild Channel: <#${this.discord.app.config.discord.gcchannel}>`,
                `Officer Channel: <#${this.discord.app.config.discord.occhannel}>`,
              ].join('\n'),
            }
          ],
          color: message.guild.me.displayHexColor,
          footer: {
            text: 'Made by Quickdev/Indian'
          },
          timestamp: new Date()
        }
      ]
    })
  }
}

module.exports = HelpCommand 

/**const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show the Help menu')}**/
    