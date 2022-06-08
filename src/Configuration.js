const fs = require('fs')

class Configuration {
	properties = {
		server: {
			host: 'localhost',
			port: 25565,
		},
		minecraft: {
			username: null,
			password: null,
			lobbyHolder: null,
			accountType: 'microsoft',
		},
		discord: {
			token: null,
			clientid:null,
			guildid: null,
			gcchannel: null,
			dmchannel: null,
			occhannel: null,
			joinleavechannel: null,
			commanderIds: null,
			ownerId: null,
			prefix: "+",
			messageMode: "webhook",
			thumbnail: "https://",
			guildname: null
			
		},
	}

	environmentOverrides = {
		SERVER_HOST: val => (this.properties.server.host = val),
		SERVER_PORT: val => (this.properties.server.port = val),
		MINECRAFT_USERNAME: val => (this.properties.minecraft.username = val),
		MINECRAFT_PASSWORD: val => (this.properties.minecraft.password = val),
		MINECRAFT_LOBBY_HOLDER: val => (this.properties.minecraft.lobbyHolder = val),
		MINECRAFT_ACCOUNT_TYPE: val => (this.properties.minecraft.accountType = val),
		DISCORD_TOKEN: val => (this.properties.discord.token = val),
		DISCORD_CLIENTID: val => (this.properties.discord.clientid = val),
      	DISCORD_GUILDID: val => (this.properties.discord.guildid = val),
      	DISCORD_GCCHANNEL: val => (this.properties.discord.gcchannel = val),
      	DISCORD_DMCHANNEL: val => (this.properties.discord.dmchannel = val),
      	DISCORD_OCCHANNEL: val => (this.properties.discord.occhannel = val),
      	DISCORD_JOINLEAVECHANNEL: val => (this.properties.discord.joinleavechannel = val),
      	DISCORD_COMMANDERIDS: val => (this.properties.discord.commanderIds = val),
      	DISCORD_OWNERID: val => (this.properties.discord.ownerId = val),
      	DISCORD_PREFIX: val => (this.properties.discord.prefix = val),
      	DISCORD_MESSAGEMODE: val => (this.properties.discord.messageMode = val),
      	DISCORD_THUMBNAIL: val => (this.properties.discord.thumbnail = val),
      	DISCORD_GUILDNAME: val => (this.properties.discord.guildname = val)
	}

	constructor() {
		if (fs.existsSync('config.json')) {
			this.properties = require('../config.json')
		}

		for (let environment of Object.keys(process.env)) {
			if (this.environmentOverrides.hasOwnProperty(environment)) {
				this.environmentOverrides[environment](process.env[environment])
			}
		}
	}

	get server() {
		return this.properties.server
	}

	get minecraft() {
		return this.properties.minecraft
	}

	get discord() {
		return this.properties.discord
	}
}

module.exports = Configuration
