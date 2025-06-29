const DiscordCommand = require('../../contracts/DiscordCommand')

class ForceGListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'forcelist'
		this.aliases = ['fl', 'fli']
		this.description = 'Shows who is in the guild + forces uuid checks for everyone'
	}

	onCommand(message) {

		let chatType = this.getChannelType(message)
		this.setChatTypes(chatType)
		this.setforceFullGuildRefresh(true) 
		this.sendMinecraftMessage(`/g list`)
		
	}
}

module.exports = ForceGListCommand
