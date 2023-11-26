const DiscordCommand = require('../../contracts/DiscordCommand')

class GListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'inactivity'
		this.aliases = ['inactive', 'inact']
		this.description = 'Kicks a memeber from the guild with a message of inactivity'
	}

	onCommand(message) {

        let args = this.getArgs(message)
		let user = args.shift()

		this.sendMinecraftMessage(`/g kick ${user ? user : ''} You have been kicked for inactivity! Do feel free to join back whenever you get back on Skyblock! :)`)
		
	}
}

module.exports = GListCommand