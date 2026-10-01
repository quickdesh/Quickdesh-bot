const DiscordCommand = require('../../contracts/DiscordCommand')

class BanCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'ban'
		this.aliases = []
		this.description = 'Bans a player (saved by UUID) and kicks them from the guild with the reason'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}ban <ign> [reason]`,
			sections: [
				{
					name: 'What it does',
					lines: [
						'Adds the player to the ban list with the reason, the time and who banned them',
						'Kicks them from the guild in-game with `Banned: <reason>` (only if the bot is online in Minecraft)',
						'Bans are saved by UUID, so they still apply after a name change',
						'Banning someone who is already banned replaces the old reason'
					]
				},
				{
					name: 'Where the ban list is checked',
					lines: [
						'**Join requests** turn red with a ⛔ BANNED section, and the button becomes **Accept anyway**',
						`**${prefix}invite** refuses to invite a banned player unless you add \`force\``,
						'**Someone joining the guild** (e.g. invited in-game) sends a ⛔ alert to the join/leave channel',
						'**Accept anyway** on a banned player posts a warning with **Unban** and **Kick** buttons',
						'**member** shows a ⛔ Banned section on the 👤 page'
					]
				}
			],
			examples: [`${prefix}ban Bob scamming members`, `${prefix}ban Bob`]
		}
	}

	onCommand(message) {
		this.discord.ban({ channel: message.channel, args: this.getArgs(message), author: message.author.username })
	}
}

module.exports = BanCommand
