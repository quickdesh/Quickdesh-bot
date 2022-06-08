const DiscordCommand = require('../../contracts/DiscordCommand')

class MemInfoCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'member'
		this.aliases = ['m', 'mem']
		this.description = 'Gets information of the specific Guild Member'
	}

	onCommand(message) {
		let args = this.getArgs(message)
		let user = args.shift()

		let chatType = this.getChannelType(message)
		this.setChatTypes(chatType)

		this.sendMinecraftMessage(`/g member ${user ? user : ''}`)
	}
}

module.exports = MemInfoCommand
