const fetch = require("cross-fetch")
const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const MessageHandler = require('./handlers/MessageHandler')
const CommandHandler = require('./CommandHandler')
const Discord = require('discord.js')
const { EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js')
const EmbedHandler = require('./EmbedHandler')
class DiscordManager extends CommunicationBridge {
  constructor(app) {
    super()

    this.app = app

    this.stateHandler = new StateHandler(this)
    this.messageHandler = new MessageHandler(this, new CommandHandler(this))
  }

  connect() {
    this.client = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildWebhooks,
        Discord.GatewayIntentBits.GuildEmojisAndStickers,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages,
      ],
      allowedMentions: {
        parse: [
          "users"
        ]
      }
    })



    
    this.client.on('ready', () => this.stateHandler.onReady())

    this.client.on('messageCreate', async message => {
      
      this.messageHandler.onMessage(message)
    
    })

    this.client.on('interactionCreate', async butt => {

      if (!butt.isButton()) return
      
      if (butt.isButton()){
        await butt.deferUpdate()
      }
      if(butt.customId.split(" ")[0] == "acceptjoinee"){
        butt.message.edit({ embeds: butt.message.embeds,components: [butt.message.components[1]]})
        const player = butt.customId.split(" ")[1]
        this.app.minecraft.bot.chat(`/g accept ${player}`)
        butt.message.reply({content: `${butt.user} accepted ${player}`})
      }
      else if(butt.customId.split(" ")[0] == "rejectjoinee"){
        butt.message.edit({ embeds: butt.message.embeds,components: [butt.message.components[1]]})
        const player = butt.customId.split(" ")[1]
        butt.message.reply({content: `${butt.user} rejected ${player}`})
      }
    })
    
    this.client.login(this.app.config.discord.token).catch(error => {
      this.app.log.error(error)

      process.exit(1)
    })

    process.on('SIGINT', () => this.stateHandler.onClose())
  }

  async onBroadcast({ username, message, guildRank, chatType }) {
    
    var channelType=''
    if (chatType == "Guild"){
      channelType=this.app.config.discord.gcchannel
    }
    else if (chatType == "Officer"){
      channelType=this.app.config.discord.occhannel
    }
    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        this.app.log.broadcast(`${username} [${guildRank}]: ${message}`, `Discord`)
        this.app.discord.client.channels.fetch(channelType).then(channel => {
          channel.send({
            embeds: [
                {
                description: message,
                color: 0x6495ED,
                timestamp: new Date(),
                footer: {
                  text: guildRank,
                },
                author: {
                  name: username,
                  icon_url: `https://www.mc-heads.net/head/${username.replace(" ","")}`,
                },
              }
            ]
          })
        })
        break

      case 'webhook':
        message = message.replace(/@/g, '') // Stop pinging @everyone or @here
        if (message.includes("), reply to (")){
          var msg=message.split("), reply to (")
          message=`> ${msg[1].substring(0,msg[1].length-1)}\n\n${msg[0].substring(1)}`
        }
        if (chatType=="Guild"){
          this.app.log.broadcast(`${username} [${guildRank}]: ${message}`, `Discord`)
        this.app.discord.gcwebhook.send({
          content: message,
          username: username,
          avatarURL: await `https://www.mc-heads.net/head/${username.replace(" ","")}`
        })}

        else if (chatType=="Officer"){
          this.app.log.broadcast(`${username} [${guildRank}]: ${message}`, `Discord`)
          this.app.discord.ocwebhook.send({
            content: message,
            username: username,
            avatarURL: await `https://www.mc-heads.net/head/${username.replace(" ","")}`
          })
        }
        else if (chatType=="dm"){
          this.app.log.broadcast(`${username}: ${message}`, `DM`)
          this.app.discord.client.channels.fetch(this.app.config.discord.dmchannel).then(async dmchannel => {
            var thread = dmchannel.threads.cache.find(x => x.name == `${username}`)

              if(thread !== undefined){

                this.app.discord.dmwebhook.send({
                  content: message,
                  username: username,
                  avatarURL: await `https://www.mc-heads.net/head/${username.replace(" ","")}`,
                  threadId: thread.id
                })

              }

              else{
                dmchannel.threads.create({
                  name: `${username}`,
                  autoArchiveDuration: 60,
                  reason: `A thread for Dms with ${username}`,
                }).then( async thread => {

                  this.app.discord.dmwebhook.send({
                    content: message,
                    username: username,
                    avatarURL: await `https://www.mc-heads.net/head/${username.replace(" ","")}`,
                    threadId: thread.id
                  })
                })
              } 
          })
        }
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }

  getChatChannels(chatTypes){

    for(let i = 0; i<= chatTypes.length; i++){

      if (chatTypes[i] == "guild") chatTypes[i] = this.app.config.discord.gcchannel

      if (chatTypes[i] == "officer") chatTypes[i] = this.app.config.discord.occhannel

      if (chatTypes[i] == "message") chatTypes[i] = this.app.config.discord.dmchannel

      if (chatTypes[i] == "joinleave") chatTypes[i] = this.app.config.discord.joinleavechannel

    }
    return chatTypes
  }

  onBroadcastCleanEmbed({ message, color }) {
    this.app.log.broadcast(message, 'Event')

    this.app.discord.client.channels.fetch(this.app.config.discord.gcchannel).then(channel => {
      channel.send({
        embeds: [
          {
          color: color,
          description: message,
          }
        ]
      })
    })
  }

  onBroadcastHeadedEmbed({ message, title, icon, color,chatType }) {
    this.app.log.broadcast(message, 'Event')
    if (chatType=="gc"){
    this.app.discord.client.channels.fetch(this.app.config.discord.gcchannel).then(channel => {
      channel.send({
        embeds: [
            {
              color: color,
              author: {
                name: title,
              },
              thumbnail: {
                url: icon,
              },
              description: message,
            }
        ]
      })
    })}
    else if (chatType=="oc"){
      this.app.discord.client.channels.fetch(this.app.config.discord.joinleavechannel).then(channel => {
        if (title == "Join Request"){
          channel.send({
            embeds: [
                {
                  color: color,
                  author: {
                    name: title,
                  },
                  thumbnail: {
                    url: icon,
                  },
                  description: message,
                }
            ]
          }).then( async message =>{
            const player= icon.replace("https://mc-heads.net/head/","")
            let response = await fetch(`https://playerdb.co/api/player/minecraft/${player}`)
            let data = await response.text()
            const player_uuid = JSON.parse(data).data.player.id.toString()
            if(title == "Join Request"){
              const accept_reject = new ActionRowBuilder().addComponents(
                                      new ButtonBuilder().setCustomId(`acceptjoinee ${player}`).setLabel(`Accept`).setEmoji({ name: "qyes", id: "933344650771697754" }).setStyle(ButtonStyle.Secondary),
                                      new ButtonBuilder().setCustomId(`rejectjoinee ${player}`).setLabel(`Reject`).setEmoji({ name: "qnon", id: "933344718790750229" }).setStyle(ButtonStyle.Secondary)
                                    )
              const player_links = new ActionRowBuilder().addComponents(
                                      new ButtonBuilder().setLabel(`Namemc`).setEmoji({ name: "qnamemc", id: "933348124175511653" }).setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${player_uuid}`),
                                      new ButtonBuilder().setLabel(`Skycrypt`).setEmoji({ name: "qskycrypt", id: "933347115030175865" }).setStyle(ButtonStyle.Link).setURL(`https://sky.shiiyu.moe/stats/${player}`)
                                    )
                                  
              message.edit({ embeds: message.embeds,components: [accept_reject,player_links]})
              
              }
            
          })
      }else{
        channel.send({
          embeds: [
              {
                color: color,
                author: {
                  name: title,
                },
                thumbnail: {
                  url: icon,
                },
                description: message,
              }
          ]
        })
      }
      })}

  }
  guildOnline({title,g1,g2,on,chatTypes}){

		this.app.log.broadcast('Guild Online', 'Command')

		const name = title.split("Guild Name: ")
		const onlineMembers = on.split(": ")[0] + ": " + (parseInt(on.split(":")[1])-1).toString() // Subtract 1 player (bot) from the given number
		const guildRanks = g1.slice(0 , -1).split(",") 
		const guildMembers = g2.slice(0 , -1).split(",")

    var chatChannels = this.getChatChannels(chatTypes)
    
    for(let i = 0; i < chatChannels.length; i++)

		{this.app.discord.client.channels.fetch(chatChannels[i]).then(channel => {

			if((guildMembers[guildMembers.length-1]=="") && (guildMembers.length==1)){
				const embed1 = new EmbedBuilder()
				.setTitle(`${name[1]}`)
  			.setColor(0x47F049)
				.setTimestamp(Date.now())
				.setFooter({ text : onlineMembers })
				.setThumbnail(this.app.config.discord.thumbnail)
				.addFields({name: "No one is online at the moment", value:  "⁽ᴵ ᶠᵉᵉˡ ˡᵒⁿᵉˡʸ⁾", inline: false})
				channel.send({ embeds: [embed1] })

			}else{
				
				if(guildMembers[guildMembers.length-1]==""){
					guildMembers.pop()
				}
				const embed2 = new EmbedBuilder()
				.setTitle(`${name[1]}`)
				.setColor(0x47F049)
				.setTimestamp(Date.now())
				.setFooter({ text : onlineMembers } )
				.setThumbnail(this.app.config.discord.thumbnail)
				for (let i = 0; i <guildRanks.length; i++){
          if(guildMembers[i].replace(/\[(..P\+?\+?)\]/g,'') == ` ${this.app.config.minecraft.lobbyHolder} ●`) continue

          // if (guildMembers.length == 2 && i == 1) embed2.addFields("<:blank:983742482351263744>","<:blank:983742482351263744>",false)

					embed2.addFields({ name: guildRanks[i], value: guildMembers[i].replace(/\[(..P\+?\+?)\]/g,'')  // Remove player ranks
                                      .replace(/\●  /g,'● ')  // Fix spacing between player names
                                      .replace(/_/g,"\\_")  // Fix underscores causing italics
                                      .replace(`${this.app.config.minecraft.lobbyHolder} ● `,''), inline: false})   // Remove Bot from embed
        }
        channel.send({ embeds: [embed2] })
				
			}
		})}
	

	}
	guildList({title,g1,g2,mem,chatTypes}){

		this.app.log.broadcast('Guild List', 'Command')

		const name = title.split("Guild Name: ")
		const totalMembers = mem.split(": ")[0] + ": " + (parseInt(mem.split(":")[1])-1).toString()
		const guildRanks = g1.slice(0 , -1).split(",") 
		const guildMembers = g2.slice(0 , -1).split(",")

    var chatChannels = this.getChatChannels(chatTypes)
    
    for(let i = 0; i < chatChannels.length; i++)

		{this.app.discord.client.channels.fetch(chatChannels[i]).then(channel => {

			const embed = new EmbedBuilder()
			.setTitle(`${name[1]}`)
  		.setColor(0x47F049)
			.setTimestamp(Date.now())
      .setFooter({ text: totalMembers })
			.setThumbnail(this.app.config.discord.thumbnail)
			for (let i = 0; i <guildRanks.length; i++){

        if(guildMembers[i].replace(/\[(..P\+?\+?)\]/g,'') == ` ${this.app.config.minecraft.lobbyHolder} ●`) continue

				embed.addFields({ name: guildRanks[i], value: guildMembers[i].replace(/\[(..P\+?\+?)\]/g,'')  // Remove player ranks
                                   .replace(/\●  /g,'● ')  // Fix spacing between player names
                                   .replace(/_/g,"\\_")  // Fix underscores causing italics
                                   .replace(`${this.app.config.minecraft.lobbyHolder} ● `,''), inline: false})   // Remove Bot from embed
			}
			
			channel.send({ embeds: [embed] })
		})}
	

	}

  memberInformation({rank,joined,chatTypes}){
		this.app.log.broadcast('Member Info', 'Command')

    var chatChannels = this.getChatChannels(chatTypes)
    
    for(let i = 0; i < chatChannels.length; i++)

		{this.app.discord.client.channels.fetch(chatChannels[i]).then(channel => {

      var MyDate = joined.split(" ")[1].split("-")
      if (MyDate[1]=="01"){
        MyDate[1]="January"
      }
      else if (MyDate[1]=="02"){
        MyDate[1]="February"
      }
      else if (MyDate[1]=="03"){
        MyDate[1]="March"
      }
      else if (MyDate[1]=="04"){
        MyDate[1]="April"
      }
      else if (MyDate[1]=="05"){
        MyDate[1]="May"
      }
      else if (MyDate[1]=="06"){
        MyDate[1]="June"
      }
      else if (MyDate[1]=="07"){
        MyDate[1]="July"
      }
      else if (MyDate[1]=="08"){
        MyDate[1]="August"
      }
      else if (MyDate[1]=="09"){
        MyDate[1]="September"
      }
      else if (MyDate[1]=="10"){
        MyDate[1]="October"
      }
      else if (MyDate[1]=="11"){
        MyDate[1]="November"
      }
      else if (MyDate[1]=="12"){
        MyDate[1]="December"
      }

			const embed = new EmbedBuilder()
  		.setColor(0x47F049)
			.setTimestamp(Date.now())
			.setThumbnail(this.app.config.discord.thumbnail)
			.addFields({ name: "Rank", value: rank.replace("Rank: ",""), inline: false})
      .addFields({ name: "Joined", value: `${MyDate[2]} ${MyDate[1]} ${MyDate[0]}`, inline: false})

      const player_links = new ActionRowBuilder().addComponents(
                                  new ButtonBuilder().setLabel(`Namemc`).setEmoji({ name: "qnamemc", id: "933348124175511653" }).setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${player_uuid}`),
                                  new ButtonBuilder().setLabel(`Skycrypt`).setEmoji({ name: "qskycrypt", id: "933347115030175865" }).setStyle(ButtonStyle.Link).setURL(`https://sky.shiiyu.moe/stats/${player}`)
                                )

			channel.send({ embeds: [embed] })
		})}
	

	}

  friendList({list}){
		this.app.log.broadcast('Friend List', 'Command')
    console.log(list)
		this.app.discord.client.channels.fetch(this.app.config.discord.gcchannel).then(channel => {
      var friends=""
      for(var j=0;j<list.length;j++){
      for(var i=1;i<9;i++){
        if(i!=0){
          if (list[j][i]!=''){
          friends=friends+list[j][i]+"\n\n"}
        }
      }}
			const embed = new EmbedBuilder()
			.setTitle(`Friend List`)
  		.setColor(0x47F049)
			.setTimestamp(Date.now())
      .setDescription(`${friends}`)
			
			
      var revlist=list.reverse()
      revlist=revlist[0][0].split(" of ")
      if (revlist[0].split(" ").reverse()[0]==revlist[1].split(" ")[0].replace(")","")){
			channel.send({ embeds: [embed] })}
		})
	

}
/**DmMessage({player,message}){
  this.app.discord.client.channels.fetch(this.app.config.discord.dmchannel).then(async dmc => {
    dmc.send({
      embeds: [
          {
          description: message,
          color: '6495ED',
          timestamp: new Date(),
          author: {
            name: player,
            icon_url: 'https://www.mc-heads.net/head/' + player,
          },
        }
      ]
    })
 })}
 **/

   onPlayerToggle({ username, message, color }) {
    this.app.log.broadcast(username + ' ' + message, 'Event')

    switch (this.app.config.discord.messageMode.toLowerCase()) {
      case 'bot':
        this.app.discord.client.channels.fetch(this.app.config.discord.gcchannel).then(channel => {
          channel.send({
            embeds: [
              {
                color: color,
                timestamp: new Date(),
                author: {
                  name: `<:egg_right:1178195628615028776> ${username} ${message}`,
                  icon_url: `https://www.mc-heads.net/head/${username.replace(" ","")}`,
                }
              }
            ]
          }) // .then(async sent => {await EmbedHandler.addit(`${username} ${message}` , sent.id)})
        })
        break

      case 'webhook':
        // if (EmbedHandler.includes(`${username} ${message}`) == true){
        //   this.app.discord.client.channels.fetch(this.app.config.discord.gcchannel).then(async channel => {
        //     await channel.messages.fetch(await EmbedHandler.get(`${username} ${message}`)).then( async message => {message.delete()})
        //   })
        // }
        this.app.discord.gcwebhook.send({
          username: username,
          avatarURL: `https://www.mc-heads.net/head/${username.replace(" ","")}`,
          embeds: [
            {
              color: color,
              description: `<:egg_right:1178195628615028776> ${username} ${message}`,
            }
          ]
        }) // .then(async sent => {await EmbedHandler.addit(`${username} ${message}` , sent.id)})
        break

      default:
        throw new Error('Invalid message mode: must be bot or webhook')
    }
  }
}

module.exports = DiscordManager