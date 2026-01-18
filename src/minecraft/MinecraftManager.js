const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const ErrorHandler = require('./handlers/ErrorHandler')
const ChatHandler = require('./handlers/ChatHandler')
const mineflayer = require('mineflayer')
const config=require('../../config.json')
const Discord = require('discord.js')
var a=0

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
			if(bot.username == username){return}

			if(!rank){rank = "Non"};
			
			if(partystatus == "busy"){
				console.log(`Log > [${rank}] ${username} sent me a party invite (in party)`)
				bot.chat(`/p leave`)
				waity(1)
				bot.chat(`/p ${username}`)
				partystatus = "busy"
				console.log(`Log > I left and accepted the invite`)
			}
			else{
				console.log(`Log > [${rank}] ${username} sent me a party invite`)

				bot.chat(`/p ${username}`)
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

			const commandRegex = /^\+(.+) (.+)/i;

			if (message && commandRegex.test(message)) {
				const matches = message.match(commandRegex);
				const command = matches[1];

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

	onBroadcast({ username, message, replyingTo, repliedTomsg, Attachmsg, chatType}) {
		function waity(seconds) {
			var waitTill = new Date(new Date().getTime() + seconds * 1000)
			while (waitTill > new Date()) {}
		}

		if(Attachmsg == undefined){

			message=message.replace("ez","e z")
						   .replace("Ez","E z")
						   .replace("EZ","E Z")
						   .replace("eZ","e Z")
		}

		if(chatType=="guild"){
			waity(0.3)
			if ((this.bot.player !== undefined) && (replyingTo == undefined) && (Attachmsg == undefined)){
				this.app.log.broadcast(`${username}: ${message}`, 'Guild')
				
				this.bot.chat(`/gc ${username}: ${message}`)

			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)){
			
				if(message!==""){
				this.app.log.broadcast(`${username}: ${message}`, 'Guild')
				this.bot.chat(`/gc ${username}: ${message}`)
				waity(0.2)
			}

				this.bot.chat(`/gc ${username} sent an attachment in Discord`)
				this.app.log.broadcast(`${username} sent an attachment in Discord`, 'Guild')
			}
			else if (this.bot.player !== undefined) {
				this.app.log.broadcast(`${username} replied to ${replyingTo}: ${message}`, 'Guild')
				this.bot.chat(`/gc ${replyingTo ? `${username} -> ${replyingTo} >> ${repliedTomsg} <<` : `${username}:`} ${message}`)
			}
		
	
		}

		else if(chatType=="officer"){
			waity(0.3)
			if ((this.bot.player !== undefined) && (replyingTo == undefined) && (Attachmsg == undefined)){
				this.app.log.broadcast(`${username}: ${message}`, 'Officer')
		
				this.bot.chat(`/oc ${username}: ${message}`)
	
			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)){
		
				if(message!==""){
				this.app.log.broadcast(`${username}: ${message}`, 'Officer')
				this.bot.chat(`/oc ${username}: ${message}`)
				waity(0.2)
			}
				this.bot.chat(`/oc ${username} sent an attachment in Discord`)
				this.app.log.broadcast(`${username} sent an attachment in Discord`, 'Officer')
			}
			else if (this.bot.player !== undefined) {
				this.app.log.broadcast(`${username} replied to ${replyingTo}: ${message}`, 'Officer')
			
				this.bot.chat(`/oc ${replyingTo ? `${username} -> ${replyingTo} "${repliedTomsg}" :` : `${username}:`} ${message}`)
			}
		}

		else if(chatType=="message"){
			if ((this.bot.player !== undefined) && (Attachmsg == undefined)){

				this.app.log.broadcast(`To ${replyingTo}: ${message}`, 'DM')
		
				this.bot.chat(`/w ${replyingTo} ${message}`)
	
			}
			else if ((this.bot.player !== undefined) && (Attachmsg !== undefined)){
		
				if(message!=="") {
				this.bot.chat(`/w ${replyingTo} ${message}`)
				waity(0.2)
			}
				this.bot.chat(`/w ${replyingTo} ${Attachmsg}`)
				this.app.log.broadcast(`Sent an attachment to ${replyingTo}`, 'DM')
			}
		}
		

	}
	
	
	
}

module.exports = MinecraftManager
