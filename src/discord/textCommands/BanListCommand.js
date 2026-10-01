const DiscordCommand = require('../../contracts/DiscordCommand')

class BanListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'banlist'
		this.aliases = ['bans', 'bl']
		this.description = 'Shows everyone on the ban list with the reason, when and by who'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}banlist`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Lists every banned player, newest first, with the date, who banned them and the reason',
						'Names update automatically if a banned player changes their name'
					]
				}
			],
			examples: [`${prefix}banlist`]
		}
	}

	onCommand(message) {
		this.discord.banList({ channel: message.channel })
	}
}

module.exports = BanListCommand
