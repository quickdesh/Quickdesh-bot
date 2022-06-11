const DiscordCommand = require('../../contracts/DiscordCommand')

class CommandCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'command'
		this.aliases = ['c', 'com']
		this.description = 'Runs the given command'
	}

	onCommand(message) {

		let chatType = this.getChannelType(message)
		this.setChatTypes (chatType)

		let chatMessage = this.getMessage(message)
		
		this.sendMinecraftMessage(chatMessage)
	}
}

module.exports = CommandCommand
