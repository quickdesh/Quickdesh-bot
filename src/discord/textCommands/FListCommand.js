const DiscordCommand = require('../../contracts/DiscordCommand')

class FListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'flist'
		this.aliases = ['fl', 'fli']
		this.description = 'Shows friend list'
		this.isAdminCommand = false
	}

	onCommand(message) {
		let args = this.getArgs(message)
		let user = args.shift()

		this.sendMinecraftMessage(`/f list`)
	}
}

module.exports = FListCommand
