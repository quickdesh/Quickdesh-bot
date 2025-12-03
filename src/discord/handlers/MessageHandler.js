const { MessageMentions } = require("discord.js")

class MessageHandler {
	constructor(discord, command) {
	  this.discord = discord
	  this.command = command
	}

	async onEdit(oldMessage,newMessage){
		
		if (oldMessage.content!=newMessage.content){

			console.log(`${oldMessage.member.displayName} edited their message, from "${oldMessage.content}" to "${newMessage.content}"`)
			this.discord.app.minecraft.bot.chat(`/gc ${oldMessage.member.displayName} edited (${oldMessage.content}) to (${newMessage.content})`)
		}
		else{
			return
		}
	}

	async onMessage(message) {

		if(message.guildId == this.discord.app.config.discord.guildid){

			if (message.content.toLowerCase().indexOf("bean") != -1) message.react("986216693024051220")
			if (message.content.toLowerCase().indexOf("meow") != -1) {
				const cats = [
					"1445772124332621958", "1445772125645574144", "1445772127327359140",
					"1445772128279597129", "1445772129734754404", "1445772130569555969",
					"1445772131647361175", "1445772132863836295", "1445772347952074953",
					"1445772135611236546", "1445772349382070302"
				]
				const randomCat = cats[Math.floor(Math.random() * cats.length)];
				message.react(randomCat)
			}
		} 
		
		if (!this.shouldBroadcastMessage(message)) {
			return
		}

		let isCommand = await this.command.handle(message)
	
		if (isCommand) {
			return
		}
	
		const content = await this.stripDiscordContent(message)
		if ((content.length == 0) && (!message.attachments.size > 0)){
			return
		}
	
		this.discord.broadcastMessage({
			username: message.member.displayName,
			message: await this.stripDiscordContent(message),
			replyingTo: await this.fetchReplymem(message),
			repliedTomsg: await this.fetchReplymsg(message),
			Attachmsg: await this.fetchAttachmsg(message),
			chatType: await this.chatType(message),
		})
	}

  async chatType(message){
	  
	  if (message.channel.parentId == this.discord.app.config.discord.dmchannel){
		return "message"
	  }
	  else if(message.channel.id == this.discord.app.config.discord.gcchannel){
		return "guild"
	  }
	  else if(message.channel.id == this.discord.app.config.discord.occhannel){
		return "officer"
	}
  }
	async fetchReplymem(message) {

		if (message.channel.parentId != this.discord.app.config.discord.dmchannel){
			try {
				if (!message.reference) return null

				const reference = await message.channel.messages.fetch(message.reference.messageId)

				return reference.member ? reference.member.displayName : reference.author.username

			} catch (e) {
				return null
			}
		}
		else return message.channel.name
	}
	async fetchReplymsg(message) {
		try {
			if (!message.reference) return null

			const reference = await message.channel.messages.fetch(message.reference.messageId)
			if (reference.attachments.size > 0 && reference.content.length <= 0){
				return "Discord attatchment"
			}

			return this.stripDiscordContent(reference, true)
			
		} catch (e) {
			return null
		}
	}

	async fetchAttachmsg(message) {
		try {
			if (message.attachments.size>0){
				var yes
				message.attachments.forEach(attachment => {

					yes = attachment.url
					
				})
				return yes
				 
			}
			
		} catch (e) {
			return null
		}
	}


	async stripDiscordContent(message, reply = false) {
		var new_cont_arr=message.content.split("\n")
		var new_content
		if (new_cont_arr.length==3){
			new_content = new_cont_arr[2]
		}
		else{
			new_content = new_cont_arr[0]
		}
		var word = new_content.split(" ")

		new_content =""
		for(let i=0; i<word.length; i++){

			for(let j=0; j<1; j++){

				if (word[i].match(/<[@|#|!|&]{1,2}(\d+){16,}>/g)){

					if(word[i].includes("@")){

						var at=word[i].split("<@")[1].split(">")[0].replace("!","")

						if (!word[i].includes("&")){

							word[i] = await message.guild.members.fetch(at).then( member =>{

									if (member.nickname == "Indian"){
										return "@Quickdev" 
										
									}
									else if(member.nickname == null){
										return "@" + member.user.username
									}
									else{
										return "@" + member.nickname
										
									}
								})
							} else {
								at = at.replace("&","")
								word[i] = await message.guild.roles.fetch(at).then( role =>{
									return "@" + role.name
								})
							}
					}

					else if(word[i].includes("#")){
						var ch=word[i].split("<#")[1].split(">")[0]
						word[i] = await message.guild.channels.fetch(ch).then(channel =>{
							return "#" + channel.name
						})
					}
				}
			}
			new_content += word[i] + " "
		}

		if (reply == true) {
			new_content = new_content.slice(0, 15) + `${new_content.length > 15 ? "..." : ""}`
		}

		return new_content.trimEnd()
	}
			

	 
	
  
	shouldBroadcastMessage(message) {
		if(message.attachments.size > 0){
			return !message.author.bot && (message.channel.id == this.discord.app.config.discord.gcchannel || message.channel.parentId == this.discord.app.config.discord.dmchannel || message.channel.id == this.discord.app.config.discord.occhannel )
		}else{
			return !message.author.bot && (message.channel.id == this.discord.app.config.discord.gcchannel || message.channel.parentId == this.discord.app.config.discord.dmchannel || message.channel.id == this.discord.app.config.discord.occhannel ) && message.content && message.content.length > 0
		}	}
  }
  
  module.exports = MessageHandler