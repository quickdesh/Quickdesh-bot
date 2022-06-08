const DiscordCommand = require('../../contracts/DiscordCommand')

class GOnlineCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'online'
		this.aliases = ['o', 'on']
		this.description = 'Shows who is online'
	}

	onCommand(message) {

		let chatType = this.getChannelType(message)
		this.setChatTypes(chatType)

		this.sendMinecraftMessage(`/g online`)
	}
}

module.exports = GOnlineCommand
