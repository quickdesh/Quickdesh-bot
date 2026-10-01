const DiscordCommand = require('../../contracts/DiscordCommand')

class GListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'list'
		this.aliases = ['l', 'li']
		this.description = 'Shows who is in the guild'
		this.isAdminCommand = false
	}

	help(prefix) {
		return {
			usage: `${prefix}list`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Lists every guild member grouped by rank, highest rank first',
						'Comes from the Hypixel API (cached for 1 minute) and also saves everyone\'s rank and guild exp'
					]
				}
			],
			examples: [`${prefix}list`]
		}
	}

	onCommand(message) {
		this.discord.guildList({ channel: message.channel })
	}
}

module.exports = GListCommand
