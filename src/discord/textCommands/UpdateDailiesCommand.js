const DiscordCommand = require('../../contracts/DiscordCommand')
const EmbedHandler = require('../EmbedHandler')
const DailiesService = require('../services/DailiesService')

class UpdateDailies extends DiscordCommand {

  constructor(discord) {
    this.discord = discord
    this.name = "updatedailies"
    this.aliases = []
    this.isAdminCommand = true
  }

  async onCommand(message) {

    if (!EmbedHandler.includes("dailiesEmbed")) {
      return message.reply("No active Dailies embed found.")
    }

    let args = this.getArgs(message)
    let action = args.shift()?.toLowerCase()

    if (action === "a") action = "add"
    if (action === "r") action = "remove"
    if (!["add", "remove"].includes(action)) {
        return message.reply("First argument must be `add (a)` or `remove (r)`.")
    }

    let zone = args.shift()?.toLowerCase()
    if (!["utc", "et"].includes(zone)) {
        return message.reply("Second argument must be `utc` or `et`.")
    }

    let text = args.join(" ")
    if (!text) {
        return message.reply("You must provide text to add / remove.")
    }

    await DailiesService.updateJson(this.discord.client, action, zone, text)
    message.channel.send("🔄 Dailies embed updater updated.")
  }
}

module.exports = UpdateDailies