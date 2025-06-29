const EventHandler = require('../../contracts/EventHandler')
const LogHandler = require('./LogHandler/LogHandler.js')
const mineflayer = require('mineflayer')

var gname= ""
var online=""
var total=""
var gm=""
var gr=""
var fl=[]
var mem_exp=""
var mem_name=""
var mem_rank=""
var mem_join=""
var lineType="none"
var isMemName=false

var commandChatTypes = []
var forceFullGuildRefresh = false

class StateHandler extends EventHandler {
	constructor(minecraft, command) {
		super()

		this.minecraft = minecraft
		this.command = command
	}

	setCommandChatTypes(chatTypes){
		commandChatTypes = chatTypes
	}

	setforceFullGuildRefresh(forceFullRefresh = false) {
		forceFullGuildRefresh = forceFullRefresh
	}

	registerEvents(bot) {
		this.bot = bot

		this.bot.on('message', (...args) => this.onMessage(...args))
	}

	onMessage(event) {
		
		const message = event.toString().trim()

		if (message.indexOf("❤ ") == -1 && 
		message.indexOf("✎Mana") == -1 && 
		message.indexOf("Guild > ") == -1 && 
		message.indexOf("Officer > ") == -1 && 
		message.indexOf("To ") != 0 && 
		message.indexOf("From ") != 0 && 
		message.indexOf("You are currently in Build Mode!") == -1 &&
		message.indexOf("Use the Housing Menu to customize several things about your house!") == -1 && 
		message.indexOf("New themes can be unlocked by opening Mystery Boxes!") == -1 &&
		message.indexOf("Change your home's Visiting Rules to allow friends or anyone to visit it!") == -1 && 
		message.indexOf("Punch players with your Nether Star to access player options for that player!") == -1 && 
		message.indexOf("Typing /toggleborder or changing to Social Mode will hide the red border around your house.") == -1 && 
		message.indexOf("Typing /toggletips will toggle these messages.") == -1 && 
		message.indexOf("[NPC] The Carpenter: I hope it wasn't too windy on your way here, Quickdesh! Come talk to me when you are ready!") == -1 &&
		message.indexOf("New themes can be unlocked using Mystery Dust!") == -1) 
		console.log(message)

		if (this.Guild_Name(message)) {
			gname= ""
		 	online=""
			total=""
			gm=""
			gr=""
			lineType="none"
			
			gname=(`${message}`)
			return 
		}

		if (this.Guild_members(message)) {
			
			gm+=(`${message},`)

		}

		if (this.Rank(message)) {
			
			gr+=(`${message},`)

			
		}

		if (this.Tot_Memebers(message)) {
			
			total=(`${message}`)

		}

		if (this.On_Memebers(message)) {
			
			online=(`${message}`)
			lineType="Guild_List"
				
		}
		if (this.Guild_Name_Name(message)){
			isMemName = true
		}
		if (this.Member_Name(message)){
			if (!this.Guild_Name_Name(message)) {
				isMemName = false
				mem_name=message.trim()
			}
		}
		if (this.Member_Rank(message)){
			mem_rank=message
		}
		if (this.Member_Join(message)){
			mem_join=message
		}


		if (this.Member_Info(message)) {
			
			lineType="Member_Info"
				
		}

		if (this.Member_Guild_Exp(message)) {
			mem_exp += message.trim() + "\n"
		}

		if (this.isFriendList(message)){
			var flist=message.split("\n")
			flist.pop()
			flist.shift()
			if (flist[0].includes("(Page 1 of")){
				fl=[]
			}
			fl.push(flist)
			return this.minecraft.friendList({list : fl})
		}
		if(this.Line(message)){
			if(lineType=="Guild_List"){
				lineType="none"
				LogHandler.updateGuildList(gr, gm, forceFullGuildRefresh)
				this.setforceFullGuildRefresh(false)
				return this.minecraft.guildList({title : gname, g1 : gr, g2 : gm, mem : total, chatTypes: commandChatTypes})
			
			}else if(lineType=="Guild_Online"){
				lineType="none"
				return this.minecraft.guildOnline({title : gname, g1 : gr, g2 : gm, on : online, chatTypes: commandChatTypes})

			}else if(lineType=="Member_Info"){
				lineType="none"
				let exp = mem_exp.trim()
				mem_exp = ""
				return this.minecraft.memberInformation({player: mem_name, rank: mem_rank, joined: mem_join, exp: exp, chatTypes: commandChatTypes})

			}
			
			
		}

		if (this.Off_Memebers(message)) {
			lineType="Guild_Online"
		}
		
		if (this.isLoginMessage(message)) {
			let user = message.split('>')[1].trim().split('joined.')[0].trim()

			let join_array = [
				"hath bestowed upon us the radiance of their presence!",
				"has arrived!",
				"logged on!",
				"awoke from their deep slumber!",
				"has decided to play on Hypixel!",
				"is ready to RIP and TEAR!",
				"enthusiastically extends a warm and hearty greeting to everyone!",
				":)!",
				"has breached the firewalls and is currently materialising somehwere near you!",
				"joined us!",
				"has entered the fray!",
				"materialized!",
				"beamed in!",
				"burst onto the scene!",
				"has descended to our realm.",
				"connected to the server."
			]

			let num = Math.floor(Math.random() * join_array.length)

			LogHandler.playerJoined(user)
	  
			return this.minecraft.broadcastPlayerToggle({ username: user, message: join_array[num], color: 0x47F049 })
		  }
	  
		  if (this.isLogoutMessage(message)) {
			let user = message.split('>')[1].trim().split('left.')[0].trim()

			let leave_array = [
				"hath withdrawn, leaving behind a void in our midst!",
				"has departed!",
				"logged off!",
				"has gone into a deep slumber!",
				"has decided to go and touch grass!",
				"concludes that it is done!",
				"grudgingly bids a melancholic and bittersweet farewell to everyone!",
				":(!",
				"has reinforced the firewalls and is presently dematerializing from your vicinity!",
				"left us!",
				"has retreated from the fray!",
				"dematerialized!",
				"beamed out!",
				"slipped off the scene!",
				"has ascended from our realm.",
				"disconnected from the server."
			]

			let num = Math.floor(Math.random() * leave_array.length)

			LogHandler.playerLeft(user)
	  
			return this.minecraft.broadcastPlayerToggle({ username: user, message: leave_array[num], color: 0xF04947 })
		  }
		
		  if (this.isFriend(message)) {
			let user = message
			.replace("You are now friends with ", '')
			return this.minecraft.broadcastCleanEmbed({ message: `Friended ${user}`, color: 0x47F049 })}

		if (this.isUnfriend(message)) {
			let user = message
			.replace("You removed ", '')
			.replace(/-+/g,'')
			.replace(" from your friends list!", '')
			.replace("\n",'')
			return this.minecraft.broadcastCleanEmbed({ message: `Unfriended ${user}`, color: 0xF04947 })}

		if (this.isJoinMessage(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]
			
			LogHandler.addPlayer(user.replace(" ",""))
			
			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} joined the guild!`,
				title: `Member Joined`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0x47F049,
				chatType: 'gc',
			})
		}
		if (this.isJoinMessageoc(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]
				
			
			
			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} joined the guild!`,
				title: `Member Joined`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0x47F049,
				chatType: 'oc',
			})
		}

		if (this.isLeaveMessage(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]

			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} left the guild!`,
				title: `Member Left`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0xF04947,
				chatType: 'gc',
			})
		}
		if (this.isLeaveMessageoc(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]

			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} left the guild!`,
				title: `Member Left`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0xF04947,
				chatType: 'oc',
			})
		}

		if (this.isKickMessage(message)) {
			console.log(message)
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]

			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} was kicked from the guild!`,
				title: `Member Kicked`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0xF04947,
				chatType: 'gc',
			})
		}
		if (this.isKickMessageoc(message)) {
			console.log(message)
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]

			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} was kicked from the guild!`,
				title: `Member Kicked`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0xF04947,
				chatType: 'oc',
			})
		}

		if (this.isRequestMessage(message)) {
			let user = message
				.replaceAll("-","")
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]

			return this.minecraft.broadcastHeadedEmbed({
				message: `${user} requested to join the guild!`,
				title: `Join Request`,
				icon: `https://mc-heads.net/head/${user.replace(" ","")}`,
				color: 0xFFFF00,
				chatType: 'oc',
			})
		}

		if (this.isPromotionMessage(message)) {
			let username = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]
			let newRank = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(' to ')
				.pop()
				.trim()

			return this.minecraft.broadcastCleanEmbed({ message: `${message}`, color: 0x47F049 })
		}

		if (this.isDemotionMessage(message)) {
			let username = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[0]
			let newRank = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(' to ')
				.pop()
				.trim()

			return this.minecraft.broadcastCleanEmbed({ message: `${message}`, color: 0xF04947 })
		}
		if (this.isChangeMessage(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `${message}`, color: 0xFFA500 })
		}

		if (this.isBlockedMessage(message)) {
			const matches = message.match(/"[^"]*?: ([^"]+)"/);
			const blockedMsg = matches ? matches[1] : null;

			return this.minecraft.broadcastCleanEmbed({ message: `Message \`${blockedMsg}\` was blocked by Hypixel.`, color: 0xDC143C })
		}

		if (this.isRepeatMessage(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `You cannot say the same message twice!`, color: 0xDC143C })
		}

		if (this.isNoPermission(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `I don't have permission to do that!`, color: 0xDC143C })
		}

		if (this.isIncorrectUsage(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: message.split("'").join('`'), color: 0xDC143C })
		}

		if (this.isOnlineInvite(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[2]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} was invited to the guild!`, color: 0x47F049 })
		}

		if (this.isOfflineInvite(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[6]
				.match(/\w+/g)[0]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} was offline invited to the guild!`, color: 0x47F049 })
		}

		if (this.isFailedInvite(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: message.replace(/\[(.*?)\]/g, '').trim(), color: 0xDC143C })
		}

		if (this.isGuildMuteMessage(message)) {
			let time = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[7]

			return this.minecraft.broadcastCleanEmbed({ message: `Guild Chat has been muted for ${time}`, color: 0xF04947 })
		}

		if (this.isGuildUnmuteMessage(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `Guild Chat has been unmuted!`, color: 0x47F049 })
		}

		if (this.isUserMuteMessage(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[3]
				.replace(/[^\w]+/g, '')
			let time = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[5]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} has been muted for ${time}`, color: 0xF04947 })
		}

		if (this.isUserUnmuteMessage(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(/ +/g)[3]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} has been unmuted!`, color: 0x47F049 })
		}

		if (this.isSetrankFail(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `Rank not found.`, color: 0xDC143C })
		}

		if (this.isAlreadyMuted(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `This user is already muted!`, color: 0xDC143C })
		}

		if (this.isNotInGuild(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(' ')[0]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} is not in the guild.`, color: 0xDC143C })
		}

		if (this.isLowestRank(message)) {
			let user = message
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(' ')[0]

			return this.minecraft.broadcastCleanEmbed({ message: `${user} is already the lowest guild rank!`, color: 0xDC143C })
		}

		if (this.isAlreadyHasRank(message)) {
			return this.minecraft.broadcastCleanEmbed({ message: `They already have that rank!`, color: 0xDC143C })
		}

		if (this.isTooFast(message)) {
			return this.minecraft.app.log.warn(message)
		}

		if (this.isPlayerNotFound(message)) {
			let user = message.split(' ')[8].slice(1, -1)

			return this.minecraft.broadcastCleanEmbed({ message: `Player \`${user}\` not found.`, color: 0xDC143C })
		}
		
		if (!this.isGuildMessage(message) && !this.isOfficerMessage(message) && !this.isDM(message)) {
			return
		}
		if(!this.isDM(message)){

			let parts = message.split(':')
			let chattype = parts[0].split(" >")[0]
			let group = parts.shift().trim()
			let hasRank = group.endsWith(']')

			let userParts = group.split(' ')
			let username = userParts[userParts.length - (hasRank ? 2 : 1)]
			let guildRank = userParts[userParts.length - 1].replace(/[\[\]]/g, '')
		

			if (guildRank == username) {
				guildRank = 'Member'
			}

			if (this.isMessageFromBot(username)) {
				return
			}

			const playerMessage = parts.join(':').trim()
			if (playerMessage.length == 0) {
				return
			}



			this.minecraft.broadcastMessage({
				username: username,
				message: playerMessage,
				guildRank: guildRank,
				chatType: chattype,
			})}
		else {
			let username=message
				.split(": ")[0]
				.replace("From ","")
				.replace("To ","")
				.replace(/\[(.*?)\]/g, '')
				.trim()
				.split(' ')[0]
			let playerMessage=message.split(": ")[1]
			let guildRank=""
			let chattype="dm"
			

			this.minecraft.broadcastMessage({
				username: username,
				message: playerMessage,
				guildRank: guildRank,
				chatType: chattype,
			})

		}
	}

	

	isMessageFromBot(username) {
		return this.bot.username === username
	}

	
	On_Memebers(message) {
		return message.startsWith(`Online Members:`)
		
	}
	Tot_Memebers(message) {
		return message.startsWith(`Total Members:`)
		
	}
	Off_Memebers(message) {
		return message.startsWith(`Offline Members:`)
		
	}
	Rank(message) {
		return message.includes("-- ")
	}
	Guild_Name(message) {
		return message.startsWith("Guild Name: ")
	}

	Guild_members(message) {
		return message.includes('●')
	}
	Guild_Name_Name(message) {
		return message.includes(this.minecraft.app.config.discord.guildname)
	}
	Member_Name(message) {
		return isMemName
	}
	Member_Rank(message) {
		return message.includes("Rank: ")
	}
	Member_Join(message) {
		return message.includes("Joined: ")
	}

	Member_Info(message) {
		return message.includes("Guild Exp Contributions:")
	}
	Member_Guild_Exp(message) {
		return message.trim().endsWith("Guild Experience")
	}
	Line(message) {
		return message.startsWith("-----") && message.endsWith('-----')
		
	}

	isDM(message){
		return message.includes('From')
	}

	isFriend(message) {
		return message.includes('You are now friends with') && !message.includes(':')
	}

	isUnfriend(message) {
		return message.includes('You removed ') && message.includes(' from your friends list!')
	}
	isFriendList(message) {
		return message.includes('Friends (Page ') && !message.includes(':')
	}
	
	On_Friend(message){
		return message.includes(' is in ') && !message.includes(':')
	}

	Off_Friend(message){
		return message.includes(' is currently offline') && !message.includes(':')
	}

	isLobbyJoinMessage(message) {
		return (message.endsWith(' the lobby!') || message.endsWith(' the lobby! <<<')) && message.includes('[MVP+')
	}

	isGuildMessage(message) {
		return message.startsWith('Guild >') && message.includes(':')
	}
	isOfficerMessage(message) {
		return message.startsWith('Officer >') && message.includes(':')
	}

	isLoginMessage(message) {
		return message.startsWith('Guild >') && message.endsWith('joined.') && !message.includes(':')
	}

	isLogoutMessage(message) {
		return message.startsWith('Guild >') && message.endsWith('left.') && !message.includes(':')
	}

	isJoinMessage(message) {
		return message.includes('joined the guild!') && !message.includes(':')
	}

	isLeaveMessage(message) {
		return message.includes('left the guild!') && !message.includes(':')
	}

	isKickMessage(message) {
		return message.includes('was kicked from the guild by') && !message.includes(':')
	}
	isJoinMessageoc(message) {
		return message.includes('joined the guild!') && !message.includes(':')
	}

	isLeaveMessageoc(message) {
		return message.includes('left the guild!') && !message.includes(':')
	}

	isKickMessageoc(message) {
		return message.includes('was kicked from the guild by') && !message.includes(':')
	}
	isRequestMessage(message){
		return message.includes("has requested to join the Guild!") && !message.includes(':')
	}
	
	isPromotionMessage(message) {
		return message.includes('was promoted from') && !message.includes(':')
	}

	isDemotionMessage(message) {
		return message.includes('was demoted from') && !message.includes(':')
	}
	isChangeMessage(message){
		return message.includes("'s rank was changed from") && !message.includes(':')
	}
	isBlockedMessage(message) {
		return message.includes('We blocked your comment \"')
	}

	isRepeatMessage(message) {
		return message == 'You cannot say the same message twice!'
	}

	isNoPermission(message) {
		return (
			(message.includes('You must be the Guild Master to use that command!') ||
				message.includes('You do not have permission to use this command!') ||
				message.includes(
					"I'm sorry, but you do not have permission to perform this command. Please contact the server administrators if you believe that this is in error."
				) ||
				message.includes('You cannot mute a guild member with a higher guild rank!') ||
				message.includes('You cannot kick this player!') ||
				message.includes('You can only promote up to your own rank!') ||
				message.includes('You cannot mute yourself from the guild!') ||
				message.includes("is the guild master so can't be demoted!") ||
				message.includes("is the guild master so can't be promoted anymore!")) &&
			!message.includes(':')
		)
	}

	isIncorrectUsage(message) {
		return message.includes('Invalid usage!') && !message.includes(':')
	}

	isOnlineInvite(message) {
		return message.includes('You invited') && message.includes('to your guild. They have 5 minutes to accept.') && !message.includes(':')
	}

	isOfflineInvite(message) {
		return (
			message.includes('You sent an offline invite to') &&
			message.includes('They will have 5 minutes to accept once they come online!') &&
			!message.includes(':')
		)
	}

	isFailedInvite(message) {
		return (
			(message.includes('is already in another guild!') ||
				message.includes('You cannot invite this player to your guild!') ||
				(message.includes("You've already invited") && message.includes('to your guild! Wait for them to accept!')) ||
				message.includes('is already in your guild!')) &&
			!message.includes(':')
		)
	}

	isUserMuteMessage(message) {
		return message.includes('has muted') && message.includes('for') && !message.includes(':')
	}

	isUserUnmuteMessage(message) {
		return message.includes('has unmuted') && !message.includes(':')
	}

	isGuildMuteMessage(message) {
		return message.includes('has muted the guild chat for') && !message.includes(':')
	}
	

	isGuildUnmuteMessage(message) {
		return message.includes('has unmuted the guild chat!') && !message.includes(':')
	}

	isSetrankFail(message) {
		return message.includes("I couldn't find a rank by the name of ") && !message.includes(':')
	}

	isAlreadyMuted(message) {
		return message.includes('This player is already muted!') && !message.includes(':')
	}

	isNotInGuild(message) {
		return message.includes(' is not in your guild!') && !message.includes(':')
	}

	isLowestRank(message) {
		return message.includes("is already the lowest rank you've created!") && !message.includes(':')
	}

	isAlreadyHasRank(message) {
		return message.includes('They already have that rank!') && !message.includes(':')
	}

	isTooFast(message) {
		return message.includes('You are sending commands too fast! Please slow down.') && !message.includes(':')
	}

	isPlayerNotFound(message) {
		return message.startsWith(`Can't find a player by the name of`)
	}
}

module.exports = StateHandler
