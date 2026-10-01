const fetch = require("cross-fetch")
const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const MessageHandler = require('./handlers/MessageHandler')
const InteractionHandler = require('./handlers/InteractionHandler')
const CommandHandler = require('./CommandHandler')
const Discord = require('discord.js')
const { EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js')
const EmbedHandler = require('./EmbedHandler')
const GuildManager = require("../guild/GuildManager.js")
const { buildMemberInfoMessage, buildGuildListMessage, buildGuildOnlineMessage } = require("./MemberEmbeds")

class DiscordManager extends CommunicationBridge {
  constructor(app) {
    super()

    this.app = app

    this.stateHandler = new StateHandler(this)
    this.messageHandler = new MessageHandler(this, new CommandHandler(this))
    this.interactionHandler = new InteractionHandler(this)
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

    this.client.on('interactionCreate', async interaction => {
      this.interactionHandler.buttonInteraction(interaction)
      this.interactionHandler.slashInteraction(interaction)
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
    const channels = {
      guild: this.app.config.discord.gcchannel,
      officer: this.app.config.discord.occhannel,
      message: this.app.config.discord.dmchannel,
      joinleave: this.app.config.discord.joinleavechannel
    }
    return chatTypes.map(type => channels[type] ?? type)
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
  guildOnline({ guildName, groups, chatTypes }){
    this.app.log.broadcast('Guild Online', 'Command')

    const message = buildGuildOnlineMessage({ guildName, groups }, {
      thumbnail: this.app.config.discord.thumbnail,
      lobbyHolder: this.app.config.minecraft.lobbyHolder
    })

    for (const channelId of this.getChatChannels(chatTypes)) {
      this.app.discord.client.channels.fetch(channelId).then(channel => channel.send(message))
    }
  }

  async guildList({ channel }){
    this.app.log.broadcast('Guild List', 'Command')

    try {
      const guild = await GuildManager.getGuild(this.app)
      await channel.send(buildGuildListMessage(guild, {
        thumbnail: this.app.config.discord.thumbnail,
        lobbyHolder: this.app.config.minecraft.lobbyHolder
      }))
    } catch (err) {
      this.app.log.error(`Guild list failed: ${err.message}`)
      await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't load the guild list: ${err.message}` }] })
    }
  }

  async memberInformation({ username, channel }){
    this.app.log.broadcast('Member Info of ' + username, 'Command')

    try {
      const info = await GuildManager.getMemberInfo(this.app, username)

      if (!info) {
        await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't find a player called **${username}**.` }] })
        return
      }

      for (const error of info.stats.errors) this.app.log.error(`Member info for ${info.name}: ${error}`)

      await channel.send(buildMemberInfoMessage({
        name: info.name,
        member: info.member,
        stats: info.stats,
        thumbnail: this.app.config.discord.thumbnail
      }))
    } catch (err) {
      this.app.log.error(`Member info failed for ${username}: ${err.message}`)
      await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't load member info: ${err.message}` }] })
    }
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