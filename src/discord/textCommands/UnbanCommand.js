const DiscordCommand = require('../../contracts/DiscordCommand')

class UnbanCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'unban'
		this.aliases = ['ub']
		this.description = 'Removes a player from the ban list'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}unban <ign>`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Removes the ban and shows who banned them, when and why',
						'Does not invite them back; use `invite` for that'
					]
				}
			],
			examples: [`${prefix}unban Bob`]
		}
	}

	onCommand(message) {
		this.discord.unban({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = UnbanCommand
