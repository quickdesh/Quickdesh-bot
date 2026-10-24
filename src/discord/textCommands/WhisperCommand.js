const DiscordCommand = require('../../contracts/DiscordCommand')

class WhisperCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'whisper'
		this.aliases = ['w', 'msg', 'message']
		this.description = 'Whispers a player in-game and opens their DM thread'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}whisper <ign or uuid> <message>`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Sends `/w <ign> <message>` in-game through the bot',
						'Finds that player\'s thread in the DM channel, or creates one, and posts your message there',
						'Their replies come into that thread, and you can keep replying from inside it',
						'If the player is offline or can\'t be messaged, a ⚠️ note appears in the thread'
					]
				}
			],
			examples: [`${prefix}whisper Bob are you free for dungeons?`, `${prefix}w Bob hi`]
		}
	}

	onCommand(message) {
		const [target, ...words] = this.getArgs(message).filter(Boolean)
		this.discord.whisper({ message, target, text: words.join(' ') })
	}
}

module.exports = WhisperCommand
