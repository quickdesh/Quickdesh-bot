const EmbedHandler = require('../EmbedHandler')
const DailiesService = require('../services/DailiesService')

class StopDailies {

  constructor(discord) {
    this.discord = discord
    this.name = "stopdailies"
    this.aliases = []
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