const DiscordCommand = require('../../contracts/DiscordCommand')

class GuildChatCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'guildchat'
		this.aliases = ['gc']
		this.description = 'Sends a message in guild chat as the b'
	}

	onCommand(message) {
		let chatMessage = message.content.slice(4)

		this.sendMinecraftMessage(`/gc ${chatMessage ? chatMessage : ''}`)
	}
}

module.exports = GuildChatCommand
