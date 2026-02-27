const EmbedHandler = require('../EmbedHandler')
const DailiesService = require("../services/DailiesService")

class StateHandler {
	constructor(discord) {
	this.discord = discord
	}

	async onReady() {
		this.discord.app.log.discord('Client ready, logged in as ' + this.discord.client.user.tag)
		this.discord.client.user.setActivity('Guild Chat', { type: 'WATCHING' })

		
		if (EmbedHandler.includes("dailiesEmbed")) {
			DailiesService.start(this.discord.client)
		}

		if (this.discord.app.config.discord.messageMode == 'webhook') {
			this.discord.gcwebhook = await getGcWebhook(this.discord)
			this.discord.ocwebhook = await getOcWebhook(this.discord)
			this.discord.dmwebhook = await getDmWebhook(this.discord)
		}
		if (EmbedHandler.includes(`Bridge Online`) == true){
			this.discord.client.channels.fetch(this.discord.app.config.discord.gcchannel).then(async channel => {
			await channel.messages.fetch(await EmbedHandler.get(`Bridge Online`)).then( async message => {message.delete()})
			})
		}
		this.discord.client.channels.fetch(this.discord.app.config.discord.gcchannel).then(channel => {
			channel.send({
			embeds: [
				{
				author: { name: `Chat Bridge is Online` },
				color: 0x47F049
				}
			]
			}).then(async sent => {await EmbedHandler.addit(`Bridge Online` , sent.id)})
		})
	}
	
	onClose() {
		if (EmbedHandler.includes(`Bridge Offline`) == true){
			this.discord.client.channels.fetch(this.discord.app.config.discord.gcchannel).then(async channel => {
			await channel.messages.fetch(await EmbedHandler.get(`Bridge Offline`)).then( async message => {message.delete()})
			})
		}
		this.discord.client.channels.fetch(this.discord.app.config.discord.gcchannel).then(channel => {
			channel.send({
			embeds: [
				{
				author: { name: `Chat Bridge is Offline` },
				color: 0xF04947
				}
			]
			}).then(async sent => {await EmbedHandler.addit(`Bridge Offline` , sent.id)}).then(() => { process.exit() })
		}).catch(() => { process.exit() })
	}
}
  
async function getGcWebhook(discord) {
	let channel = discord.client.channels.cache.get(discord.app.config.discord.gcchannel)
	let webhooks = await channel.fetchWebhooks()
	if (webhooks.first()) {
	return webhooks.first()
	} else {
	return await channel.createWebhook(discord.client.user.username, {avatar: discord.client.user.avatarURL(),})
	
	}	
}

async function getOcWebhook(discord) {
	let channel = discord.client.channels.cache.get(discord.app.config.discord.occhannel)
	let webhooks = await channel.fetchWebhooks()
	if (webhooks.first()) {
		return webhooks.first()
	} else {
		return await channel.createWebhook(discord.client.user.username, {avatar: discord.client.user.avatarURL(),})
	}	
}

async function getDmWebhook(discord) {
	let channel = discord.client.channels.cache.get(discord.app.config.discord.dmchannel)
	let webhooks = await channel.fetchWebhooks()
	if (webhooks.first()) {
		return webhooks.first()
	} else {
		return await channel.createWebhook(discord.client.user.username, {avatar: discord.client.user.avatarURL(),})
	}	
}
  
module.exports = StateHandler