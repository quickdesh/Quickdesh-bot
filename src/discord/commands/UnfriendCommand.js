const DiscordCommand = require('../../contracts/DiscordCommand')

class UnfriendCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'unfriend'
		this.aliases = ['uf', 'unfr']
		this.description = 'Unfriends the given user'
	}

	onCommand(message) {
		let args = this.getArgs(message)
		let user = args.shift()

		this.sendMinecraftMessage(`/f remove ${user ? user : ''}`)
	}
}

module.exports = UnfriendCommand
