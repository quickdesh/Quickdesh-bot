const DiscordCommand = require('../../contracts/DiscordCommand')

class ExemptCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'exempt'
		this.aliases = ['ex']
		this.description = 'Exempts members from activity checks for a set time'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}exempt add <ign> <duration> [reason] | ${prefix}exempt remove <ign> | ${prefix}exempt list`,
			sections: [
				{
					name: 'What it does',
					lines: [
						`Exempt members are left out of the active/inactive lists in \`${prefix}activelist\` and shown under 🛡️ Exempt instead, with their stats, when it ends and the reason.`
					]
				},
				{
					name: 'Subcommands',
					lines: [
						'`add <ign> <duration> [reason]` · exempt someone. The reason is optional and can be several words',
						'`remove <ign>` · end an exemption early (also `rm`, `delete`)',
						'`list` · show everyone who is exempt, when it ends, the reason and who added it (also just `exempt`)'
					]
				},
				{
					name: 'Details',
					lines: [
						'Durations: `m` `h` `d` `w` `M` `y`, a bare number means days (`10` = 10 days)',
						'Exemptions are saved by UUID, so they survive name changes and work for players the bot hasn\'t seen yet',
						'Exemptions remove themselves when they run out',
						'Adding someone who is already exempt replaces their old exemption'
					]
				}
			],
			examples: [
				`${prefix}exempt add Bob 2w on holiday`,
				`${prefix}exempt add Bob 10 exams`,
				`${prefix}exempt remove Bob`,
				`${prefix}exempt list`
			]
		}
	}

	onCommand(message) {
		this.discord.exempt({ channel: message.channel, args: this.getArgs(message), author: message.author.username })
	}
}

module.exports = ExemptCommand
