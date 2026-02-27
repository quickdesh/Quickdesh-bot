const DiscordCommand = require('../../contracts/DiscordCommand')

class GListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'list'
		this.aliases = ['l', 'li']
		this.description = 'Shows who is in the guild'
		this.isAdminCommand = false
	}

	onCommand(message) {

		let chatType = this.getChannelType(message)
		this.setChatTypes(chatType)
		this.setforceFullGuildRefresh(false)
		this.sendMinecraftMessage(`/g list`)
		
	}
}

module.exports = GListCommand
