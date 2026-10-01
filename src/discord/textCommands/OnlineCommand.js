const DiscordCommand = require('../../contracts/DiscordCommand')

class GOnlineCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'online'
		this.aliases = ['o', 'on']
		this.description = 'Shows who is online'
		this.isAdminCommand = false
	}

	help(prefix) {
		return {
			usage: `${prefix}online`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Lists guild members who are online right now, grouped by rank',
						'Read from the bot\'s in-game `/g online`, so the bot has to be online in Minecraft'
					]
				}
			],
			examples: [`${prefix}online`]
		}
	}

	onCommand(message) {

		let chatType = this.getChannelType(message)
		this.setChatTypes(chatType)

		this.sendMinecraftMessage(`/g online`)
	}
}

module.exports = GOnlineCommand
