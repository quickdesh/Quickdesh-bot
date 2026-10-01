const CommunicationBridge = require('../contracts/CommunicationBridge')
const StateHandler = require('./handlers/StateHandler')
const MessageHandler = require('./handlers/MessageHandler')
const InteractionHandler = require('./handlers/InteractionHandler')
const CommandHandler = require('./CommandHandler')
const Discord = require('discord.js')
const { EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js')
const EmbedHandler = require('./EmbedHandler')

const DETAILS_AUTO_HIDE_MS = 5 * 60 * 1000
const detailTimers = new Map()
const GuildManager = require("../guild/GuildManager.js")
const { formatBan, formatFormerBan, latestFormerBan, buildBanListMessage, buildBanRecordMessage, buildMemberInfoMessage, buildJoinRequestEmbeds, buildJoinRequestProfileRow, buildGuildListMessage, buildGuildOnlineMessage, buildActivityListMessages, buildActivityDefaultsMessage, buildExemptionListMessage } = require("./MemberEmbeds")

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

  onBroadcastHeadedEmbed({ message, title, icon, color, chatType, username }) {
    this.app.log.broadcast(message, 'Event')

    const embed = {
      color: color,
      author: { name: title },
      thumbnail: { url: icon },
      description: message,
    }

    const channelId = chatType == "gc" ? this.app.config.discord.gcchannel : this.app.config.discord.joinleavechannel

    this.app.discord.client.channels.fetch(channelId).then(channel => {
      if (chatType == "oc" && title == "Join Request" && username) {
        return this.joinRequest({ channel, embed, username })
      }
      return channel.send({ embeds: [embed] })
    })
  }

  joinRequestRows({ name, uuid, hasDetails, showDetails, verdictRow = null, profileRow = null }) {
    const links = new ActionRowBuilder().addComponents(
      ...(hasDetails ? [
        new ButtonBuilder()
          .setCustomId(`joinreq-details:${showDetails ? "hide" : "show"}:${name}`)
          .setLabel(showDetails ? "Hide Details" : "Show Details")
          .setEmoji(showDetails ? "🔼" : "🔽")
          .setStyle(ButtonStyle.Primary)
      ] : []),
      new ButtonBuilder().setLabel(`Namemc`).setEmoji({ name: "qnamemc", id: "933348124175511653" }).setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${uuid ?? name}`),
      new ButtonBuilder().setLabel(`Skycrypt`).setEmoji({ name: "qskycrypt", id: "933347115030175865" }).setStyle(ButtonStyle.Link).setURL(`https://sky.shiiyu.moe/stats/${name}`)
    )

    return [links, ...(showDetails && profileRow ? [profileRow] : []), ...(verdictRow ? [verdictRow] : [])]
  }

  async joinRequest({ channel, embed, username }) {
    const sent = await channel.send({ embeds: [embed] })

    let info = null
    try {
      info = await GuildManager.getMemberInfo(this.app, username)
      for (const error of info?.stats.errors ?? []) this.app.log.error(`Join request stats for ${username}: ${error}`)
    } catch (err) {
      this.app.log.error(`Join request stats failed for ${username}: ${err.message}`)
    }

    const name = info?.name ?? username
    const ban = info ? GuildManager.getBanByUuid(info.uuid) : null
    const acceptReject = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`acceptjoinee ${name}`).setLabel(ban ? `Accept anyway` : `Accept`).setEmoji({ name: "qyes", id: "933344650771697754" }).setStyle(ban ? ButtonStyle.Danger : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rejectjoinee ${name}`).setLabel(`Reject`).setEmoji({ name: "qnon", id: "933344718790750229" }).setStyle(ButtonStyle.Secondary)
    )

    const requestEmbed = info ? { ...embed, description: `${embed.description}\n🆔 \`${info.uuid}\`` } : embed
    if (ban) {
      requestEmbed.color = 0xDA373C
      requestEmbed.fields = [{ name: "⛔ This player is BANNED", value: formatBan(ban) }]
      this.warnOfficersOfBannedRequest(name, ban)
    } else if (info?.banHistory?.length) {
      requestEmbed.fields = [{ name: `📜 Previously banned (${info.banHistory.length})`, value: formatFormerBan(latestFormerBan(info.banHistory)) }]
    }

    await sent.edit({
      embeds: [requestEmbed],
      components: this.joinRequestRows({ name, uuid: info?.uuid, hasDetails: !!info, showDetails: false, verdictRow: acceptReject })
    })
  }

  findVerdictRow(message) {
    const row = message.components.find(r => r.components.some(c => c.customId?.startsWith("acceptjoinee")))
    return row ? new ActionRowBuilder().addComponents(row.components.map(c => ButtonBuilder.from(c))) : null
  }

  async joinRequestDetails({ message, name, show, profileId = null }) {
    clearTimeout(detailTimers.get(message.id))
    detailTimers.delete(message.id)

    if (!show) return this.joinRequestCollapse(message)

    try {
      const info = await GuildManager.getMemberInfo(this.app, name)
      if (!info) return

      await message.edit({
        embeds: [message.embeds[0], ...buildJoinRequestEmbeds({ ...info, profileId })],
        components: this.joinRequestRows({
          name: info.name,
          uuid: info.uuid,
          hasDetails: true,
          showDetails: true,
          verdictRow: this.findVerdictRow(message),
          profileRow: buildJoinRequestProfileRow(info, profileId)
        })
      })

      detailTimers.set(message.id, setTimeout(async () => {
        detailTimers.delete(message.id)
        const latest = await message.channel?.messages?.fetch(message.id).catch(() => null) ?? message
        const stillShown = latest.components.some(r => r.components.some(c => c.customId?.startsWith("joinreq-details:hide")))
        if (stillShown) await this.joinRequestCollapse(latest).catch(err => this.app.log.error(`Auto-hide failed for ${name}: ${err.message}`))
      }, this.detailsAutoHideMs ?? DETAILS_AUTO_HIDE_MS))
    } catch (err) {
      this.app.log.error(`Join request details failed for ${name}: ${err.message}`)
    }
  }

  async joinRequestCollapse(message, { removeVerdict = false } = {}) {
    clearTimeout(detailTimers.get(message.id))
    detailTimers.delete(message.id)

    const components = message.components
      .filter(row => !row.components.some(c => c.customId?.startsWith("joinreq-profile:")))
      .filter(row => !(removeVerdict && row.components.some(c => c.customId?.startsWith("acceptjoinee"))))
      .map(row => new ActionRowBuilder().addComponents(row.components.map(c => {
        const button = ButtonBuilder.from(c)
        if (!c.customId?.startsWith("joinreq-details:")) return button
        const name = c.customId.split(":").slice(2).join(":")
        return button.setCustomId(`joinreq-details:show:${name}`).setLabel("Show Details").setEmoji("🔽")
      })))

    await message.edit({ embeds: [message.embeds[0]], components })
  }


  async ban({ channel, args, author }){
    this.app.log.broadcast('Ban ' + args.join(' '), 'Command')
    const prefix = this.app.config.discord.prefix
    const [username, ...reasonWords] = args.filter(Boolean)
    const fail = description => channel.send({ embeds: [{ color: 0xDC143C, description }] })

    if (!username || reasonWords.length === 0) {
      return fail(`${username ? `You need to give a reason to ban **${username}**.\n\n` : ""}Usage: \`${prefix}ban <ign> <reason>\`\nExample: \`${prefix}ban ${username ?? "Bob"} scamming members\``)
    }

    try {
      const result = await GuildManager.banPlayer(username, reasonWords.join(" "), author)
      if (!result) return fail(`Couldn't find a player called **${username}**.`)

      const kickReason = `Banned: ${result.ban.reason ?? "No reason given"}`.slice(0, 200)
      const botOnline = this.app.minecraft.bot?.player !== undefined
      if (botOnline) this.app.minecraft.bot.chat(`/g kick ${result.name} ${kickReason}`)

      await channel.send({ embeds: [{
        color: 0xDA373C,
        title: `⛔ ${result.name} is banned`,
        description: [
          formatBan(result.ban),
          `🆔 \`${result.uuid}\``,
          "",
          botOnline
            ? `Kicked from the guild with: *${kickReason}*`
            : `⚠️ The bot isn't online in Minecraft, so they weren't kicked. Kick them in-game or run \`${prefix}ban\` again once the bot is back.`,
          ...(result.previous ? ["", `This replaced their earlier ban from <t:${result.previous.at}:d>${result.previous.reason ? ` (${result.previous.reason})` : ""}.`] : []),
          ...(result.history.length ? ["", `📜 They have ${result.history.length} earlier ban${result.history.length === 1 ? "" : "s"} on record. \`${prefix}banlist ${result.name}\` shows them.`] : [])
        ].join("\n")
      }] })
    } catch (err) {
      this.app.log.error(`Ban failed for ${username}: ${err.message}`)
      await fail(`Couldn't ban **${username}**: ${err.message}`)
    }
  }

  async unban({ channel, args, author }){
    this.app.log.broadcast('Unban ' + args.join(' '), 'Command')
    const prefix = this.app.config.discord.prefix
    const [username, ...reasonWords] = args.filter(Boolean)
    const fail = description => channel.send({ embeds: [{ color: 0xDC143C, description }] })

    if (!username || reasonWords.length === 0) {
      return fail(`${username ? `You need to give a reason to unban **${username}**.\n\n` : ""}Usage: \`${prefix}unban <ign> <reason>\`\nExample: \`${prefix}unban ${username ?? "Bob"} appealed and apologised\``)
    }

    try {
      const result = await GuildManager.unbanPlayer(username, reasonWords.join(" "), author)
      if (!result.removed) return fail(`**${result.name}** isn't on the ban list.`)
      await channel.send({ embeds: [{
        color: 0x47F049,
        title: `✅ ${result.name} is no longer banned`,
        description: [
          formatFormerBan(result.removed),
          `🆔 \`${result.uuid}\``,
          "",
          `This ban is kept in \`${prefix}banlist\` under former bans. Unbanning doesn't invite them back; use \`${prefix}invite ${result.name}\` for that.`
        ].join("\n")
      }] })
    } catch (err) {
      this.app.log.error(`Unban failed for ${username}: ${err.message}`)
      await fail(`Couldn't unban **${username}**: ${err.message}`)
    }
  }

  async banList({ channel, args = [] }){
    this.app.log.broadcast('Ban List ' + args.join(' '), 'Command')
    const username = args.filter(Boolean)[0]

    if (!username) {
      return channel.send(buildBanListMessage(GuildManager.listBans(), GuildManager.listFormerBans(), this.app.config.discord.prefix))
    }

    try {
      const record = await GuildManager.getPlayerBanRecord(username)
      if (!record) return channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't find a player called **${username}**.` }] })
      await channel.send(buildBanRecordMessage(record))
    } catch (err) {
      this.app.log.error(`Ban history failed for ${username}: ${err.message}`)
      await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't load the ban history for **${username}**: ${err.message}` }] })
    }
  }

  async invite({ channel, args }){
    const prefix = this.app.config.discord.prefix
    const [username, flag] = args.filter(Boolean)
    const force = flag?.toLowerCase() === "force"

    if (!username) {
      return channel.send({ embeds: [{ color: 0xDC143C, description: `Usage: \`${prefix}invite <ign> [force]\`` }] })
    }

    let banned = null
    try {
      banned = await GuildManager.checkBan(username)
    } catch (err) {
      this.app.log.error(`Ban check failed for ${username}: ${err.message}`)
      if (!force) {
        return channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't check the ban list for **${username}** (${err.message}), so they weren't invited. Use \`${prefix}invite ${username} force\` to invite anyway.` }] })
      }
    }

    if (banned && !force) {
      return channel.send({ embeds: [{
        color: 0xDA373C,
        title: `⛔ ${banned.name} is banned, so they weren't invited`,
        description: `${formatBan(banned.ban)}\n\nTo invite them anyway: \`${prefix}invite ${banned.name} force\`\nTo remove the ban: \`${prefix}unban ${banned.name} <reason>\``
      }] })
    }

    if (this.app.minecraft.bot?.player !== undefined) {
      this.app.minecraft.bot.chat(`/g invite ${banned?.name ?? username}`)
    }

    if (banned) {
      await channel.send({ embeds: [{ color: 0xF0B232, description: `⚠️ Invited **${banned.name}** even though they're banned (${banned.ban.reason ?? "no reason given"}).` }] })
    }
  }

  warnOfficersOfBannedRequest(name, ban){
    if (this.app.minecraft.bot?.player === undefined) return

    const date = new Date(ban.at * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    const start = `/oc [Ban list] ${name} sent a join request but is BANNED - check Discord before accepting. Reason: `
    const end = ` (by ${ban.by ?? "unknown"}, ${date})`
    let reason = ban.reason ?? "none given"
    const room = 256 - start.length - end.length
    if (reason.length > room) reason = `${reason.slice(0, Math.max(room - 3, 0))}...`
    this.app.minecraft.bot.chat(`${start}${reason}${end}`)
  }

  async bannedPlayerAccepted({ channel, name, by }){
    let banned = null
    try {
      banned = await GuildManager.checkBan(name)
    } catch (err) {
      this.app.log.error(`Ban check after accepting ${name} failed: ${err.message}`)
    }
    if (!banned) return

    const actions = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bannedjoinee-unban ${banned.name}`).setLabel("Unban").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`bannedjoinee-kick ${banned.name}`).setLabel("Kick").setEmoji("👢").setStyle(ButtonStyle.Danger)
    )

    await channel.send({
      embeds: [{
        color: 0xF0B232,
        title: `⚠️ Banned player accepted: ${banned.name}`,
        description: [
          `${by} accepted **${banned.name}** into the guild, but they're on the ban list.`,
          "",
          formatBan(banned.ban),
          `🆔 \`${banned.uuid}\``,
          "",
          "**Unban** to let them stay, or **Kick** to remove them again."
        ].join("\n")
      }],
      components: [actions]
    })
  }

  bannedPlayerReasonModal({ action, name, messageId }){
    const unban = action === "unban"
    return new ModalBuilder()
      .setCustomId(`bannedjoinee-${action}-reason ${messageId} ${name}`)
      .setTitle(`${unban ? "Unban" : "Kick"} ${name}`.slice(0, 45))
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel(unban ? "Why are they being unbanned?" : "Kick reason (shown in-game)")
          .setPlaceholder(unban ? "e.g. appealed and apologised" : "e.g. still banned for scamming")
          .setStyle(unban ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(unban ? 300 : 180)
          .setRequired(true)
      ))
  }

  async bannedPlayerAction({ message, action, name, by, byName, reason }){
    let outcome
    let done = true

    try {
      if (action === "unban") {
        const result = await GuildManager.unbanPlayer(name, reason, byName)
        outcome = result.removed ? `✅ Unbanned by ${by}: *${reason}*` : `ℹ️ ${name} was already unbanned`
      } else {
        const kickReason = reason.slice(0, 180)
        if (this.app.minecraft.bot?.player !== undefined) {
          this.app.minecraft.bot.chat(`/g kick ${name} ${kickReason}`)
          outcome = `👢 Kicked by ${by}: *${kickReason}*`
        } else {
          outcome = `⚠️ ${by} tried to kick (*${kickReason}*), but the bot isn't online in Minecraft. Try again once it's back.`
          done = false
        }
      }
    } catch (err) {
      this.app.log.error(`Banned player ${action} failed for ${name}: ${err.message}`)
      outcome = `⚠️ ${action === "unban" ? "Unban" : "Kick"} failed: ${err.message}`
      done = false
    }

    const embed = EmbedBuilder.from(message.embeds[0])
    const previous = embed.data.fields?.find(f => f.name === "Outcome")?.value
    embed.setFields({ name: "Outcome", value: `${previous ? `${previous}\n` : ""}${outcome}`.slice(-1024) })

    const components = done ? [] : message.components

    await message.edit({ embeds: [embed], components })
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
        uuid: info.uuid,
        member: info.member,
        stats: info.stats,
        rules: info.rules,
        ban: info.ban,
        banHistory: info.banHistory,
        thumbnail: this.app.config.discord.thumbnail
      }))
    } catch (err) {
      this.app.log.error(`Member info failed for ${username}: ${err.message}`)
      await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't load member info: ${err.message}` }] })
    }
  }

  async activeList({ channel, args }){
    this.app.log.broadcast('Activity Check ' + args.join(' '), 'Command')

    try {
      const report = await GuildManager.getActivityReport(this.app, args)

      if (report.errors.length) {
        const prefix = this.app.config.discord.prefix
        await channel.send({ embeds: [{
          color: 0xDC143C,
          description: [
            ...report.errors,
            "",
            `Usage: \`${prefix}activelist [time=2M] [sessions=20] [session_min_time=30m] [session_max_time=4h] [session_cooldown=12h] [merge_gap=10m] [gexp=50k] [playtime=40h] [match=any|all]\``,
            "Units: `m` minutes, `h` hours, `d` days, `w` weeks, `M` months, `y` years"
          ].join("\n")
        }] })
        return
      }

      for (const message of buildActivityListMessages({ ...report, prefix: this.app.config.discord.prefix })) {
        await channel.send(message)
      }
    } catch (err) {
      this.app.log.error(`Activity check failed: ${err.message}`)
      await channel.send({ embeds: [{ color: 0xDC143C, description: `Couldn't run the activity check: ${err.message}` }] })
    }
  }

  async activeConfig({ channel, args }){
    this.app.log.broadcast('Activity Config ' + args.join(' '), 'Command')
    const prefix = this.app.config.discord.prefix
    const options = args.filter(Boolean)

    if (options.length === 0 || options[0].toLowerCase() === "show") {
      await channel.send(buildActivityDefaultsMessage(GuildManager.getActivityDefaults(), {
        note: `Change with ${prefix}activeconfig sessions=20 time=2M · ${prefix}activeconfig reset`
      }))
      return
    }

    if (options[0].toLowerCase() === "reset") {
      await channel.send(buildActivityDefaultsMessage(GuildManager.resetActivityDefaults(), {
        title: "⚙️ Activity Check Defaults Reset",
        note: "Back to the built-in defaults"
      }))
      return
    }

    const result = GuildManager.setActivityDefaults(options)
    if (result.errors.length) {
      await channel.send({ embeds: [{
        color: 0xDC143C,
        description: [
          ...result.errors,
          "",
          `Usage: \`${prefix}activeconfig [time=2M] [sessions=20] [session_min_time=30m] [session_max_time=4h] [session_cooldown=12h] [merge_gap=10m] [gexp=50k] [playtime=40h] [match=any|all]\``,
          `\`${prefix}activeconfig\` shows the current defaults, \`${prefix}activeconfig reset\` restores the built-in ones`
        ].join("\n")
      }] })
      return
    }

    await channel.send(buildActivityDefaultsMessage(result.labels, {
      title: "⚙️ Activity Check Defaults Updated",
      note: `${prefix}activelist now uses these unless options are given`
    }))
  }

  async exempt({ channel, args, author }){
    this.app.log.broadcast('Exempt ' + args.join(' '), 'Command')
    const prefix = this.app.config.discord.prefix
    const [action, username, duration, ...reason] = args.filter(Boolean)
    const usage = [
      `\`${prefix}exempt add <ign> <duration> [reason]\` e.g. \`${prefix}exempt add Bob 2w on holiday\``,
      `\`${prefix}exempt remove <ign>\``,
      `\`${prefix}exempt list\``
    ].join("\n")
    const fail = description => channel.send({ embeds: [{ color: 0xDC143C, description }] })

    try {
      switch ((action ?? "list").toLowerCase()) {
        case "list":
          await channel.send(buildExemptionListMessage(GuildManager.listExemptions()))
          return

        case "add": {
          if (!username || !duration) return fail(usage)
          const result = await GuildManager.addExemption(username, duration, reason.join(" "), author)
          if (result.error) return fail(result.error)
          await channel.send({ embeds: [{
            color: 0x47F049,
            description: `🛡️ **${result.name}** is exempt for **${result.duration}**, until <t:${result.exemption.until}:f> (<t:${result.exemption.until}:R>)${result.exemption.reason ? `\nReason: ${result.exemption.reason}` : ""}`
          }] })
          return
        }

        case "remove":
        case "rm":
        case "delete": {
          if (!username) return fail(usage)
          const result = await GuildManager.removeExemption(username)
          if (!result.removed) return fail(`**${result.name}** isn't exempt.`)
          await channel.send({ embeds: [{ color: 0x47F049, description: `🛡️ Removed **${result.name}**'s exemption.` }] })
          return
        }

        default:
          return fail(usage)
      }
    } catch (err) {
      this.app.log.error(`Exempt failed: ${err.message}`)
      await fail(`Couldn't update exemptions: ${err.message}`)
    }
  }

  async memberInfoPage({ message, page, name, profileId }){
    try {
      const info = await GuildManager.getMemberInfo(this.app, name)
      if (!info) return

      await message.edit(buildMemberInfoMessage({
        name: info.name,
        uuid: info.uuid,
        member: info.member,
        stats: info.stats,
        rules: info.rules,
        ban: info.ban,
        banHistory: info.banHistory,
        thumbnail: this.app.config.discord.thumbnail,
        page,
        profileId
      }))
    } catch (err) {
      this.app.log.error(`Member info page failed for ${name}: ${err.message}`)
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