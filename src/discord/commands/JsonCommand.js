const DiscordCommand = require('../../contracts/DiscordCommand')

const { version } = require('../../../package.json')

class ScrewCommand extends DiscordCommand {
  constructor(discord) {
    super(discord)

    this.name = 'json'
    this.description = 'Returns the AOTE JSON file'
  }

  onCommand(message) {
    const FILE_PATH = "./AspectOfTheEgg.json"

    if (!fs.existsSync(FILE_PATH)) {
      return message.reply({ content: "AOTE JSON not found." })
    }

    return message.reply({
      content: "AOTE JSON:",
      files: [FILE_PATH]
    })
  }
}

module.exports = ScrewCommand 
    