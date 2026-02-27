const DiscordCommand = require('../../contracts/DiscordCommand')
const EmbedHandler = require('../EmbedHandler')
const DailiesService = require('../services/DailiesService')

class StartDailies extends DiscordCommand {

  constructor(discord) {
    super(discord)
    this.name = "startdailies"
    this.aliases = []
    this.isAdminCommand = true
  }

  async onCommand(message) {

    if (EmbedHandler.includes("dailiesEmbed")) {
      return message.reply("Dailies embed already exists.")
    }

    const msg = await message.channel.send("Initializing Dailies embed...")

    EmbedHandler.addit("dailiesEmbed", {
      channelId: msg.channel.id,
      messageId: msg.id
    })

    await DailiesService.start(this.discord.client)

    message.channel.send("✅ Dailies embed will update daily at 0 UTC and 0 ET.")
  }
}

module.exports = StartDailies