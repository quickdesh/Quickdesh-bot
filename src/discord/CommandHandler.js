const { Collection } = require('discord.js')
class CommandHandler {
  constructor(discord) {
    this.discord = discord

    this.prefix = discord.app.config.discord.prefix

    this.commands = new Collection()
    let commandFiles = fs.readdirSync('./src/discord/textCommands').filter(file => file.endsWith('.js'))
    for (const file of commandFiles) {
      const command = new (require(`./textCommands/${file}`))(discord)
      this.commands.set(command.name, command)
    }
  }
  
  async handle(message) {
    if (!message.content.startsWith(this.prefix)) {
      return false
    }
    

    let args = message.content.slice(this.prefix.length).trim().split(/ +/)
    let commandName = args.shift().toLowerCase()

    let command = this.commands.get(commandName)
      || this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) {
      return false
    }

    let isCommander = await this.isCommander(message)

    if ((command.isAdminCommand && (!this.isOwner(message) && !isCommander))) {
      message.channel.send({
        embeds: [
          {
            color: 0xDC143C,
            description: `You don't have permission to do that.`
          
          }
        ]
      })
    return true
    }


    this.discord.app.log.discord(`[${command.name}] ${message.content}`)
    command.onCommand(message)

    return true
  }

  async isCommander(message) {
    const member = await message.guild.members.fetch(message.author.id, { force: true });
    return member.roles.cache.some(r => this.discord.app.config.discord.commandRoles.includes(r.id));
  }

  isOwner(message) {
    return message.author.id == this.discord.app.config.discord.ownerId
  }
}

module.exports = CommandHandler