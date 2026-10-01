const DiscordCommand = require('../../contracts/DiscordCommand')

class InviteCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'invite'
		this.aliases = ['i', 'inv']
		this.description = 'Invites the given user to the guild (checks the ban list first)'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}invite <ign> [force]`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Invites the player to the guild through the bot',
						'Checks the ban list first: banned players are not invited, and you see why, when and by who',
						'Add `force` to invite a banned player anyway'
					]
				}
			],
			examples: [`${prefix}invite Bob`, `${prefix}invite Bob force`]
		}
	}

	onCommand(message) {
		this.discord.invite({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = InviteCommand
