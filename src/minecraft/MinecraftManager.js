const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const ErrorHandler = require('./handlers/ErrorHandler')
const ChatHandler = require('./handlers/ChatHandler')
const mineflayer = require('mineflayer')
const config=require('../../config.json')
const Discord = require('discord.js')
var a=0

const CHAT_DELAY_MS = 600

function splitChat(header, text, nextHeader = header, limit = 256) {
	const lines = []
	let rest = String(text ?? '').replace(/\s+/g, ' ').trim()
	let prefix = header.slice(0, limit - 20)

	while (rest.length) {
		const room = limit - prefix.length
		if (rest.length <= room) {
			lines.push(prefix + rest)
			break
		}

		let cut = rest.lastIndexOf(' ', room)
		if (cut <= 0) cut = room

		lines.push(prefix + rest.slice(0, cut))
		rest = rest.slice(cut).trimStart()
		prefix = nextHeader.slice(0, limit - 20)
	}

	return lines
}

function chatHeader(line) {
	const match = /^(\/(?:w|msg|tell|whisper)\s+\S+\s+|\/\S+\s+)/i.exec(line)
	return match ? match[1] : ''
}

class MinecraftManager extends CommunicationBridge {
	constructor(app) {
		super()

		this.app = app

		this.stateHandler = new StateHandler(this)
		this.errorHandler = new ErrorHandler(this)
		this.chatHandler = new ChatHandler(this)
		
	}

	async connect() {
		this.bot = await this.createBotConnection()

		this.errorHandler.registerEvents(this.bot)
		this.stateHandler.registerEvents(this.bot)
		this.chatHandler.registerEvents(this.bot)
		this.startFragBot()
	}

	createBotConnection() {
		return mineflayer.createBot({
			host: this.app.config.server.host,
			port: this.app.config.server.port,
			username: this.app.config.minecraft.username,
			password: this.app.config.minecraft.password,
			version: '1.8.9',
			auth: this.app.config.minecraft.accountType,
			logErrors: true,
			defaultChatPatterns: false,
		})
	}

	startFragBot() {
	
		let partystatus = 'disbanded'
		let runningcommand = 'none'
		const bot = this.bot
		
		bot.addChatPatternSet('GUILD_JOIN_REQUEST', [/(?:\[([^\]]+)\] )?([^:]+) has requested to join the Guild!/], {
			parse: true,
		})

		bot.addChatPatternSet('GUILD_JOIN', [/^(?:\[([^\]]+)\] )?([^:]+) joined the guild!/], {
			parse: true,
		})
		bot.addChatPatternSet('GUILD_LEAVE', [/^(?:\[([^\]]+)\] )?([^:]+) left the guild!/], {
			parse: true,
		})
		bot.addChatPatternSet('FRIEND_LIST', [/Friends \(Page (\d+) of (\d+)\)/], {
			parse: true,
		})

		bot.addChatPatternSet('NO_JOIN_DUNGEON', [/^You cannot join this Dungeon!/], {
			parse: true,
		})
		bot.addChatPatternSet('NO_JOIN_DUNGEON', [/warped the party to a SkyBlock dungeon!/], {
			parse: true,
		})
		bot.addChatPatternSet('NO_JOIN_DUNGEON', [/^Adventuring The Catacombs/], {
			parse: true,
		})
		
		bot.addChatPatternSet('YOU_ARE_AFK',[/You are AFK. Move around to return from AFK./],{
			parse: true,
		})
		bot.addChatPatternSet('GUILD_MESSAGE', [/^Guild > (?:\[([^\]]+)\] )?([^:]+): (.+)$/], {
			parse: true,
		})

		bot.addChatPatternSet('G_O_LINE', [/--------(.+)/], {
			parse: true,
		})

		bot.addChatPatternSet('G_O_M', [/(.+) Members:(.+)/], {
			parse: true,
		})

		bot.addChatPatternSet('G_O_R', [/-- (.+) --/], {
			parse: true,
		})

		bot.addChatPatternSet('G_O_N', [/^Guild Name: (.+)/], {
			parse: true,
		})

		bot.addChatPatternSet('G_O_P', [/^\[(.+)● /], {
			parse: true,
		})

		bot.addChatPatternSet('PRIVATE_MESSAGE', [/^From (?:\[([^\]]+)\] )?([^:]+): (.+)$/], {
			parse: true,
		})

		bot.addChatPatternSet('PARTY_ACCEPT', [/^(?:\[([^\]]+)\] )?([^:]+) joined the party./], {
			parse: true,
		})

		bot.addChatPatternSet('PARTY_LEAVE', [/^You left the party./], {
			parse: true,
		})

		bot.addChatPatternSet(
			'PARTY_INVITE',
			[
				/(?:\[([^\]]+)\] )?([^:]+) has invited you to join their party!/,
			],
			{
				parse: true,
			}
		)

		bot.addChatPatternSet('PARTY_WARP', [/^Party Leader, (?:\[([^\]]+)\] )?([^:]+), summoned you to their server./], {
			parse: true,
		})

		bot.addChatPatternSet(
			'PARTY_DISBAND',
			[
				/(?:\[([^\]]+)\] )?([^:]+) has disbanded the party!/,
			],
			{
				parse: true,
			}
		)
		bot.addChatPatternSet(
			'PARTY_AUTO_DISBAND',
			[
				/The party was disbanded because all invites expired and the party was empty./,
			],
			{
				parse: true,
			}
		)
		
		
		bot.addChatPatternSet('Nothing_for_relog', [/^Nothing./], {
			parse: true,
		})



		function waity(seconds) {
			var waitTill = new Date(new Date().getTime() + seconds * 1000)
			while (waitTill > new Date()) {}
		}

		

		function leaveparty() {
			bot.chat(`/p leave`)
			console.log(`Log > Left the party`)
			partystatus = 'disbanded'
			waity(0.2)
		}

		function returntohouse() {
			bot.chat("/home")
			waity(0.2)
			console.log(`Log > Returning to housing`)
		}

		function warpparty() {
			bot.chat("/p warp")
			waity(1)
		}

		function inviteannoyingplayer(annoyingplayer) {
			bot.chat(`/main`)
			waity(1)
			bot.chat(`/p invite ${annoyingplayer}`)
		}
		

		bot.on('chat:FRIEND_LIST',([[current_page,final_page]]) =>{
			if (current_page==final_page){
				return
			}
			else{
			var n=parseInt(current_page)+1
			waity(0.2)
			bot.chat(`/f list ${n}`)
			}
		})

		bot.on('chat:YOU_ARE_AFK',() => {
			console.log("LIMBO")
			returntohouse()
		})
		bot.on('chat:NO_JOIN_DUNGEON',() => {
			waity(0.1)
			leaveparty()
			returntohouse()
		})
		
		bot.on('chat:PARTY_WARP', ([[rank, username]]) => {
			if (bot.username == username) {
				return
			}
			if (!rank) {
				rank = 'Non'
			}
			waity(0.1)
			console.log(`Log > ${username} tried to warp the party`)
			leaveparty()
			returntohouse()
		})

		bot.on('chat:PARTY_ACCEPT', ([[rank, username]]) => {
			if (bot.username == username) {
				return
			}
			if (!rank) {
				rank = 'Non'
			}
			partystatus = "busy"
			if (runningcommand == "warpannoyingplayer") {
				waity(1)
				warpparty()
				console.log(`Log > Tried to warp ${username} to the hub`)
				runningcommand = "none"
				leaveparty()
				returntohouse()
			}
			runningcommand = "none"
		})

		bot.on('chat:PARTY_LEAVE', () => {
			partystatus = "disbanded"
		})

		bot.on('chat:PARTY_AUTO_DISBAND', () => {
			partystatus = "disbanded"
			runningcommand = "none"
		})
		

	
		bot.on('chat:PARTY_INVITE', ([[rank, username]]) => {
			let u = username.split(" ").pop()
			if(bot.username == u){return}

			if(!rank){rank = "Non"}
			
			if(partystatus == "busy"){
				console.log(`Log > [${rank}] ${u} sent me a party invite (in party)`)
				bot.chat(`/p leave`)
				waity(1)
				bot.chat(`/p accept ${u}`)
				partystatus = "busy"
				console.log(`Log > I left and accepted the invite`)
			}
			else{
				console.log(`Log > [${rank}] ${u} sent me a party invite`)
				waity(1)
				bot.chat(`/p accept ${u}`)
				partystatus = "busy"
				console.log(`Log > I accepted the invite`)

			}
			
		})

		bot.on('chat:PARTY_DISBAND', ([[rank, username]]) => {
			leaveparty()
		})


			
		bot.on('chat:GUILD_MESSAGE', ([[rank, username, message]]) => {
			if (!rank) {
				rank = 'Non'
			}

			const grank = username.match(/\[[^\]]+\]/)[0]

			username = username.replace(/.(\[.+\])/, '') //removes roles
							   .replace(/(:.*)/, '') //removes weird colon and username thing

			const commandRegex = /^\+(.+) (.+)/i

			if (message && commandRegex.test(message)) {
				const matches = message.match(commandRegex)
				const command = matches[1]

				if ((command == "w" || command == "warp") && grank != "[Raw]") {

					const annoyingplayer = matches[2]
					if (annoyingplayer != this.app.config.minecraft.lobbyHolder) {
						runningcommand = "warpannoyingplayer"
						inviteannoyingplayer(annoyingplayer)
					}
				}
			}
		})

		bot.on('spawn', () => {
			if (a==0){
				waity(2)
				returntohouse()
				a++
			}
		})
		bot.on('error', err => console.log(err))
	}

	chatLimit() {
		return this.bot?.supportFeature?.('lessCharsInChat') ? 100 : 256
	}

	sendChat(header, text, nextHeader = header) {
		const lines = splitChat(header, text, nextHeader, this.chatLimit())

		this.chatQueue = (this.chatQueue ?? Promise.resolve()).then(async () => {
			for (const line of lines) {
				if (this.bot?.player === undefined) return
				this.bot.chat(line)
				await new Promise(resolve => setTimeout(resolve, CHAT_DELAY_MS))
			}
		}).catch(err => this.app.log.error(`Sending to Minecraft chat failed: ${err.message}`))

		return this.chatQueue
	}

	sendChatLine(line) {
		const header = chatHeader(line)
		return this.sendChat(header, line.slice(header.length))
	}

	onBroadcast({ username, message, replyingTo, repliedTomsg, Attachmsg, chatType}) {
		function waity(seconds) {
			var waitTill = new Date(new Date().getTime() + seconds * 1000)
			while (waitTill > new Date()) {}
		}

		if(Attachmsg == undefined) {

			message=message.replace("ez","e z")
						   .replace("Ez","E z")
						   .replace("EZ","E Z")
						   .replace("eZ","e Z")
		}

		if(chatType=="guild"){
			this.bot.chat(`/chat guild`)
			waity(0.3)
			if ((this.bot.player !== undefined) && (replyingTo == undefined) && (Attachmsg == undefined)) {
				this.app.log.broadcast(`${username}: ${message}`, 'Guild')
				
				this.sendChat(`/gc ${username}: `, message)

			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)) {
			
				if(message!==""){
				this.app.log.broadcast(`${username}: ${message}`, 'Guild')
				this.sendChat(`/gc ${username}: `, message)
			}

				this.sendChat(`/gc `, `${username} sent an attachment in the Disc.`)
				this.app.log.broadcast(`${username} sent an attachment in the Disc.`, 'Guild')
			}
			else if (this.bot.player !== undefined) {
				this.app.log.broadcast(`${username} replied to ${replyingTo}: ${message}`, 'Guild')
				this.sendChat(`/gc ${replyingTo ? `${username} -> ${replyingTo} >> ${repliedTomsg} <<` : `${username}:`} `, message, `/gc ${username}: `)
			}
		
	
		}

		else if(chatType=="officer") {
			this.bot.chat(`/chat officer`)
			waity(0.3)
			if ((this.bot.player !== undefined) && (replyingTo == undefined) && (Attachmsg == undefined)) {
				this.app.log.broadcast(`${username}: ${message}`, 'Officer')
		
				this.sendChat(`/oc ${username}: `, message)

			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)) {
				if(message!==""){
				this.app.log.broadcast(`${username}: ${message}`, 'Officer')
				this.sendChat(`/oc ${username}: `, message)
			}
				this.sendChat(`/oc `, `${username} sent an attachment in the Disc.`)
				this.app.log.broadcast(`${username} sent an attachment in the Disc.`, 'Officer')
			}
			else if (this.bot.player !== undefined) {
				this.app.log.broadcast(`${username} replied to ${replyingTo}: ${message}`, 'Officer')
			
				this.sendChat(`/oc ${replyingTo ? `${username} -> ${replyingTo} "${repliedTomsg}" :` : `${username}:`} `, message, `/oc ${username}: `)
			}
		}

		else if(chatType=="message"){
			if ((this.bot.player !== undefined) && (Attachmsg == undefined)) {

				this.app.log.broadcast(`To ${replyingTo}: ${message}`, 'DM')
		
				this.sendChat(`/w ${replyingTo} `, message)
	
			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)) {
		
				if(message!=="") {
				this.sendChat(`/w ${replyingTo} `, message)
			}
				this.sendChat(`/w ${replyingTo} `, Attachmsg)
				this.app.log.broadcast(`Sent an attachment to ${replyingTo}`, 'DM')
			}
		}
	}
}

module.exports = MinecraftManager
