const DiscordCommand = require('../../contracts/DiscordCommand')

const { version } = require('../../../package.json')

class ScrewCommand extends DiscordCommand {
  constructor(discord) {
    super(discord)

    this.name = 'screw'
    this.description = 'Screw You'
  }

  onCommand(message) {
    message.reply({ content: `Screw you <@${message.author.id}>` })
  }
}

module.exports = ScrewCommand 
    