const DiscordCommand = require('../../contracts/DiscordCommand')

class MemInfoCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'member'
		this.aliases = ['m', 'mem']
		this.description = 'Gets information of the specific Guild Member'
		this.isAdminCommand = false
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
