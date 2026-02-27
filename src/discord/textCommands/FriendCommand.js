const DiscordCommand = require('../../contracts/DiscordCommand')

class FriendCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'friend'
		this.aliases = ['f', 'fr']
		this.description = 'Sends a friend request to the given user'
		this.isAdminCommand = true
	}

	onCommand(message) {
		let args = this.getArgs(message)
		let user = args.shift()

		this.sendMinecraftMessage(`/f ${user ? user : ''}`)
	}
}

module.exports = FriendCommand
