const DiscordCommand = require('../../contracts/DiscordCommand')
const { hypixelGet } = require('../../guild/handlers/HypixelApiHandler')
const GuildManager = require('../../guild/GuildManager')

function mask(key) {
	return key ? `\`••••••••${key.slice(-4)}\`` : '`not set`'
}

class ApiKeyCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'apikey'
		this.aliases = ['setkey']
		this.description = 'Shows or changes the Hypixel API key. Works in DMs with the bot too'
		this.isAdminCommand = true
		this.isOwnerCommand = true
		this.hidesArgs = true
	}

	help(prefix) {
		return {
			usage: `${prefix}apikey [new key]`,
			sections: [
				{
					name: 'Details',
					lines: [
						'Only the bot owner (`ownerId` in config.json) can use this',
						`\`${prefix}apikey\` shows the last 4 characters of the current key and checks that it still works`,
						`\`${prefix}apikey <new key>\` tests the new key with Hypixel, then uses it straight away and saves it to config.json`,
						'A key that Hypixel rejects is not saved',
						'Safest in a DM with the bot. In a server channel your message is deleted right away so the key isn\'t left in chat'
					]
				}
			],
			examples: [`${prefix}apikey`, `${prefix}apikey 01234567-89ab-cdef-0123-456789abcdef`]
		}
	}

	async onCommand(message) {
		const config = this.discord.app.config
		const prefix = config.discord.prefix
		const newKey = this.getArgs(message).filter(Boolean)[0]
		const reply = embed => message.channel.send({ embeds: [embed] })

		let deleteNote = ''
		if (newKey && message.guild) {
			const deleted = await message.delete().then(() => true).catch(() => false)
			deleteNote = deleted
				? '\nYour message with the key was deleted.'
				: '\n⚠️ Couldn\'t delete your message (the bot needs Manage Messages). Delete it yourself, and consider making a new key since it was posted here.'
		}

		if (!newKey) {
			const current = config.hypixel.apiKey
			const check = current ? await this.testKey(current) : 'No key is set'
			return reply({
				color: check === true ? 0x47F049 : 0xDC143C,
				title: '🔑 Hypixel API key',
				description: [
					`Current key: ${mask(current)}`,
					check === true ? '✅ Hypixel accepts it.' : `❌ ${check}`,
					'',
					`Change it with \`${prefix}apikey <new key>\` (safest in a DM with the bot).`
				].join('\n')
			})
		}

		const check = await this.testKey(newKey)
		if (check !== true) {
			return reply({
				color: 0xDC143C,
				title: '🔑 Key not changed',
				description: `Hypixel didn't accept the new key: ${check}\nStill using ${mask(config.hypixel.apiKey)}.${deleteNote}`
			})
		}

		let saveNote = 'Saved to config.json, so it stays after a restart.'
		try {
			config.setHypixelApiKey(newKey)
		} catch (err) {
			this.discord.app.log.error(`Couldn't save the API key to config.json: ${err.message}`)
			saveNote = `⚠️ It's in use now, but saving to config.json failed (${err.message}), so it will be lost on restart.`
		}

		if (process.env.HYPIXEL_API_KEY) {
			saveNote += '\n⚠️ The `HYPIXEL_API_KEY` environment variable is set, and it will replace this key on the next restart. Update it there too.'
		}

		GuildManager.startGuildSync(this.discord.app)
		this.discord.app.log.broadcast(`Hypixel API key changed to ••••${newKey.slice(-4)}`, 'Config')

		return reply({
			color: 0x47F049,
			title: '🔑 Hypixel API key updated',
			description: `Now using ${mask(newKey)}. Hypixel accepts it.\n${saveNote}${deleteNote}`
		})
	}

	async testKey(key) {
		try {
			await hypixelGet('punishmentstats', key)
			return true
		} catch (err) {
			return err.message
		}
	}
}

module.exports = ApiKeyCommand
