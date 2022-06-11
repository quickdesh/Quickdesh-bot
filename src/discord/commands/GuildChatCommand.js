const DiscordCommand = require('../../contracts/DiscordCommand')

class GuildChatCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'guildchat'
		this.aliases = ['gc']
		this.description = 'Sends a message in guild chat as the b'
	}

	onCommand(message) {
		let chatType = this.getChannelType(message)
		this.setChatTypes (chatType)

		let chatMessage = this.getMessage(message)
		
		this.sendMinecraftMessage(`/gc ${chatMessage}`)
	}
}

module.exports = GuildChatCommand
