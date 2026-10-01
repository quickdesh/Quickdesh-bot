const DiscordCommand = require('../../contracts/DiscordCommand')

class MemInfoCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'member'
		this.aliases = ['m', 'mem']
		this.description = 'Gets information of the specific Guild Member'
		this.isAdminCommand = false
	}

	help(prefix) {
		return {
			usage: `${prefix}member <ign>`,
			sections: [
				{
					name: 'Pages',
					lines: [
						'👤 **Member** · UUID, guild rank, join date, online status, last join, previous names (other pages show the UUID in the footer)',
						'📊 **Activity** · last 7 days of guild exp, and playtime/sessions for 7 days to 6 months (same rules as `activelist`)',
						'🏝️ **SkyBlock** · SkyBlock level, skill average, magical power, purse, bank, skills and slayers',
						'⚔️ **Dungeons** · Catacombs and class levels, highest floors, runs and secrets'
					]
				},
				{
					name: 'Details',
					lines: [
						'Use the buttons under the message to switch pages; greyed out pages have no data',
						'On 🏝️ SkyBlock and ⚔️ Dungeons, use the **Switch profile** menu to see another profile (⭐ = the one selected in-game, ♻️ Ironman, 🏝️ Stranded, 🎲 Bingo). The chosen profile stays when you change pages',
						'Data comes from the Hypixel API and is cached for 5 minutes',
						'Works for any player, not just guild members (non-members show "Not in guild")'
					]
				}
			],
			examples: [`${prefix}member Quickdev`, `${prefix}m quickdev`]
		}
	}

	onCommand(message) {
		const user = this.getArgs(message).shift()

		if (!user) {
			message.channel.send({ embeds: [{ color: 0xDC143C, description: `Usage: \`${this.discord.app.config.discord.prefix}member <username>\`` }] })
			return
		}

		this.discord.memberInformation({ username: user, channel: message.channel })
	}
}

module.exports = MemInfoCommand
