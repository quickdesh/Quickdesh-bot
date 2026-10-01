const Configuration = require('./Configuration')
const DiscordManager = require('./discord/DiscordManager')
const MinecraftManager = require('./minecraft/MinecraftManager')
const Logger = require('./Logger')
const GuildManager = require('./guild/GuildManager')

class Application {
  async register() {
    this.config = new Configuration()
    this.log = new Logger()

    this.discord = new DiscordManager(this)
    this.minecraft = new MinecraftManager(this)

    this.discord.setBridge(this.minecraft)
    this.minecraft.setBridge(this.discord)
  }

  async connect() {
    this.discord.connect()
    this.minecraft.connect()
    GuildManager.startGuildExpSync(this)
  }
}

process.on("unhandledRejection", error => {
  new Logger()
    .error(error)
})

module.exports = new Application()