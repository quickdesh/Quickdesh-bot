const DiscordCommand = require('../../contracts/DiscordCommand')

class BanListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'banlist'
		this.aliases = ['bans', 'bl']
		this.description = 'Shows current and former bans, or one player\'s full ban history'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}banlist [ign]`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Lists every banned player, newest first, with the date, who banned them and the reason',
						'Below that are the 10 most recent former bans: when, by who and why they were banned, and when, by who and why they were unbanned',
						'`banlist <ign>` shows one player\'s current ban and every former ban',
						'Names update automatically if a banned player changes their name'
					]
				}
			],
			examples: [`${prefix}banlist`, `${prefix}banlist Bob`]
		}
	}

	onCommand(message) {
		this.discord.banList({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = BanListCommand
