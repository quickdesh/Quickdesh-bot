const DiscordCommand = require('../../contracts/DiscordCommand')

class OfficerChatCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'officerchat'
		this.aliases = ['oc']
		this.description = 'Sends a message in officer chat as the bot'
	}


	onCommand(message) {
		let chatMessage = message.content.slice(4)

		this.sendMinecraftMessage(`/oc ${chatMessage ? chatMessage : ''}`)
	}
}

module.exports = OfficerChatCommand
