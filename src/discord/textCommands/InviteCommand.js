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
			usage: `${prefix}invite <ign or uuid>`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Invites the player to the guild through the bot',
						'Checks the ban list first. Banned players are never invited: you see their ban, any former bans, and are told to unban them first',
						'If they were banned before but aren\'t now, they are invited and you see their most recent former ban',
						'If the ban list can\'t be checked (e.g. Mojang is down), nobody is invited'
					]
				}
			],
			examples: [`${prefix}invite Bob`, `${prefix}invite 3f30f0d137a94e598be6d7ab0e435bb4`]
		}
	}

	onCommand(message) {
		this.discord.invite({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = InviteCommand
