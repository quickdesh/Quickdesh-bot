const DiscordCommand = require('../../contracts/DiscordCommand')

class CommandCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'command'
		this.aliases = ['c', 'com']
		this.description = 'Runs the given command'
	}

	onCommand(message) {
		
		this.sendMinecraftMessage(String(message).slice(3))
	}
}

module.exports = CommandCommand
