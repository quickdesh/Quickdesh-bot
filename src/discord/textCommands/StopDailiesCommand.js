const DiscordCommand = require('../../contracts/DiscordCommand')
const EmbedHandler = require('../EmbedHandler')
const DailiesService = require('../services/DailiesService')

class StopDailies extends DiscordCommand {

  constructor(discord) {
    super(discord)
    this.name = "stopdailies"
    this.aliases = []
    this.description = 'Stops the Dailies embed updater'
    this.isAdminCommand = true
  }

  async onCommand(message) {

    if (!EmbedHandler.includes("dailiesEmbed")) {
      return message.reply("No active Dailies embed found.")
    }

    await DailiesService.stop(this.discord.client)

    message.channel.send("🛑 Dailies embed updater stopped.")
  }
}

module.exports = StopDailies