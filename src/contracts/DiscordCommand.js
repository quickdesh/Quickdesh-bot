const ChatHandler = require('../minecraft/handlers/ChatHandler')
class DiscordCommand {
	constructor(discord) {
		this.discord = discord

		this.chatHandler = new ChatHandler(this)

	}

	getArgs(message) {
		let args = message.content.split(' ')

		args.shift()

		return args
	}

	getMessage(message) {
		let array = this.getArgs(message)

		message = ""
		for(let i = 0; i < array.length; i++) {
			message+=array[i] + " "
		}
		return message
	}

	sendMinecraftMessage(message) {
		if (this.discord.app.minecraft.bot.player !== undefined) {
			this.discord.app.minecraft.bot.chat(message)
		}
	}

	getChannelType(message) {
		let channel = message.channel.id

		if (channel == this.discord.app.config.discord.gcchannel) return ["guild"]

		if (channel == this.discord.app.config.discord.occhannel) return ["officer"]

		if (channel == this.discord.app.config.discord.dmchannel) return ["message"]

		if (channel == this.discord.app.config.discord.joinleavechannel) return ["joinleave"]

		return ["guild"]
	}

	setChatTypes(chatTypes) {

		this.chatHandler.setCommandChatTypes(chatTypes)
	}
	

	onCommand(message) {
		throw new Error('Command onCommand method is not implemented yet!')
	}
}

module.exports = DiscordCommand
