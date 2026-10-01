const DiscordCommand = require('../../contracts/DiscordCommand')

class UnbanCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'unban'
		this.aliases = ['ub']
		this.description = 'Removes a player from the ban list (a reason is required)'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}unban <ign or uuid> <reason>`,
			sections: [
				{
					name: 'Details',
					lines: [
						'A reason is required, like with `ban`',
						'Removes the ban and shows who banned them, when and why',
						'The ban is kept as a former ban, with who unbanned them, when and why. See it with `banlist <ign>`',
						'Does not invite them back; use `invite` for that'
					]
				}
			],
			examples: [`${prefix}unban Bob appealed and apologised`]
		}
	}

	onCommand(message) {
		this.discord.unban({ channel: message.channel, args: this.getArgs(message), author: message.author.username })
	}
}

module.exports = UnbanCommand
