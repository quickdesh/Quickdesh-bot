const DiscordCommand = require('../../contracts/DiscordCommand')

class OfficerChatCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'officerchat'
		this.aliases = ['oc']
		this.description = 'Sends a message in officer chat as the bot'
		this.isAdminCommand = true
	}


	onCommand(message) {
		let chatType = this.getChannelType(message)
		this.setChatTypes (chatType)

		let chatMessage = this.getMessage(message)
		
		this.sendMinecraftMessage(`/oc ${chatMessage}`)
	}
}

module.exports = OfficerChatCommand
