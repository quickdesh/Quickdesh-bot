const DiscordCommand = require('../../contracts/DiscordCommand')

const { version } = require('../../../package.json')

class FuckCommand extends DiscordCommand {
  constructor(discord) {
    super(discord)

    this.name = 'fuck'
    this.description = 'Fuck You'
  }

  onCommand(message) {
    message.reply({ content: `Fuck you <@${message.author.id}>` })
  }
}

module.exports = FuckCommand 
    