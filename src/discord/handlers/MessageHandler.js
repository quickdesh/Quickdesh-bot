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
	  if (!this.shouldBroadcastMessage(message)) {
		return
	  }
  
	  if (this.command.handle(message)) {
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

			return this.stripDiscordContent(reference)
			
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


async	stripDiscordContent(message) {
		var new_cont_arr=message.content.split("\n")
		var new_content
		if (new_cont_arr.length==3){
			new_content = new_cont_arr[2]
		}
		else{
			new_content = new_cont_arr[0]
		}
		if (new_content.includes("<@") && new_content.includes(">")){
			var new_at=''
			var at=new_content.split("<@")[1].split(">")[0].replace("!","").replace("&","")

			return message.guild.members.fetch(at).then( member =>{
				if (member.nickname == "Indian"){
					new_at="Quickdev"
					
				}
				else if(member.nickname == null){
					new_at=member.user.username
					
				}
				else{
					new_at=member.nickname
					
				}
			return new_content
				.replace(/<@/g,`@${new_at}`)
				.replace("@undefined","")
				.replace(/(\d+){16}>/g, '')
				.replace(/[#|!|&]{1,2}(\d+){16,}>/g, '\n') //@s
				.replace(/<:\w+:(\d+){16,}>/g, '\n')
				//.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '\n')//remove anything not letter,number,punctuation or seperator
				.split('\n')
				.map(part => {
		 		 part = part.trim()
  
		 		 return part.length == 0 ? '' : part + ' '
				})
				.join('')
				
			})}

		
			return new_content
			.replace(/<[@|#|!|&]{1,2}(\d+){16,}>/g, '\n') //@s
			.replace(/<:\w+:(\d+){16,}>/g, '\n')
			//.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '\n')//remove anything not letter,number,punctuation or seperator
			.split('\n')
			.map(part => {
			  part = part.trim()
	  
			  return part.length == 0 ? '' : part + ' '
			})
			.join('')
		}
			

	 
	
  
	shouldBroadcastMessage(message) {
		if(message.attachments.size > 0){
			return !message.author.bot && (message.channel.id == this.discord.app.config.discord.gcchannel || message.channel.parentId == this.discord.app.config.discord.dmchannel || message.channel.id == this.discord.app.config.discord.occhannel )
		}else{
			return !message.author.bot && (message.channel.id == this.discord.app.config.discord.gcchannel || message.channel.parentId == this.discord.app.config.discord.dmchannel || message.channel.id == this.discord.app.config.discord.occhannel ) && message.content && message.content.length > 0
		}	}
  }
  
  module.exports = MessageHandler