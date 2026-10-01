const UuidAndRanksHandler = require("./handlers/UuidAndRanksHandler.js")
const SessionsHandler = require("./handlers/SessionsHandler.js")
const GuildSyncHandler = require("./handlers/GuildSyncHandler.js")
const { getPlayerStats } = require("./handlers/HypixelStatsHandler.js")
const ActivityCheckHandler = require("./handlers/ActivityCheckHandler.js")
const ActivitySettingsHandler = require("./handlers/ActivitySettingsHandler.js")
const BanListHandler = require("./handlers/BanListHandler.js")

async function ensureUser(input) {
    const player =
        typeof input === "string"
            ? { username: input }
            : input
    await UuidAndRanksHandler.syncUuidAndRanks([player])
}

async function playerGuildNew(message) {
    const rankMatch = message.match(/\[(.*?)\]/)
    const hypixelRank = rankMatch ? rankMatch[1] : "Non"

    const user = message
        .replace(/\[(.*?)\]/g, '')
        .trim()
        .split(/ +/g)[0]
        .trim()

    const playerData = {
        username: user,
        player_rank: hypixelRank,
        guild_rank: "Raw Egg"
    }

    await ensureUser(playerData);
}

async function playerGuildMotion(message) {
    const rankMatch = message.match(/\[(.*?)\]/)
    const hypixelRank = rankMatch ? rankMatch[1] : "Non"
    const cleaned = message.replace(/\[(.*?)\]\s*/, '')

    const username = cleaned.split(' ')[0]
    const promoteMatch = cleaned.match(/to (.+)$/)
    const newGuildRank = promoteMatch ? promoteMatch[1].trim() : "Raw Egg"

    const playerData = {
        username: username,
        hypixel_rank: hypixelRank,
        guild_rank: newGuildRank
    }

    await ensureUser(playerData)
}

async function playerJoin(username, unixTime = Math.floor(Date.now() / 1000)) {
    await SessionsHandler.recordJoin(username, unixTime)
}

async function playerLeave(username, unixTime = Math.floor(Date.now() / 1000)) {
    await SessionsHandler.recordLeave(username, unixTime)
}

function startGuildSync(app) {
    GuildSyncHandler.start(app)
}

async function getGuild(app) {
    return GuildSyncHandler.syncGuild(app)
}

function parseUuid(text) {
    const raw = String(text ?? "").replace(/-/g, "").toLowerCase()
    return /^[0-9a-f]{32}$/.test(raw) ? UuidAndRanksHandler.formatUUID(raw) : null
}

function isValidName(text) {
    return /^\w{1,16}$/.test(String(text ?? ""))
}

async function lookupUuid(uuid, data) {
    const knownKey = Object.keys(data).find(k => data[k]?.uuid === uuid)
    if (knownKey) return { uuid, name: knownKey }

    const name = await UuidAndRanksHandler.fetchNameByUuid(uuid)
    if (name) return { uuid, name }

    const ban = BanListHandler.getBan(uuid) ?? BanListHandler.getHistory(uuid).pop()
    return ban ? { uuid, name: BanListHandler.getUsernames(uuid).at(-1) ?? ban.name } : null
}

function presentBan(entry, uuid, currentName) {
    if (!entry) return null
    const usernames = BanListHandler.getUsernames(uuid)
    return { ...entry, bannedAs: entry.name, name: currentName ?? usernames.at(-1) ?? entry.name, usernames }
}

async function getMemberInfo(app, username) {

    const data = UuidAndRanksHandler.loadExisting()
    let key = UuidAndRanksHandler.findKey(data, username)
    let uuid = key ? data[key].uuid : null
    let name = key

    if (!uuid && parseUuid(username)) {
        const player = await lookupUuid(parseUuid(username), data)
        if (!player) return null
        uuid = player.uuid
        name = player.name
        key = data[player.name]?.uuid === uuid ? player.name : null
    } else if (!uuid) {
        if (!isValidName(username)) return null
        const [profile] = await UuidAndRanksHandler.fetchBatch([username])
        if (!profile) return null

        uuid = UuidAndRanksHandler.formatUUID(profile.id)
        name = profile.name
        key = Object.keys(data).find(k => data[k]?.uuid === uuid) ?? null
    }

    const stats = await getPlayerStats(uuid, app.config.hypixel.apiKey)
    BanListHandler.noteName(uuid, key ?? name)

    return {
        name: key ?? name,
        uuid,
        member: key ? data[key] : null,
        stats,
        rules: ActivityCheckHandler.getSessionRules(),
        ban: presentBan(BanListHandler.getBan(uuid), uuid, key ?? name),
        banHistory: BanListHandler.getHistory(uuid).map(entry => presentBan(entry, uuid, key ?? name))
    }
}

function activityLabels(criteria) {
    const format = ActivityCheckHandler.formatDuration
    return {
        time: format(criteria.time),
        minSessionTime: format(criteria.minSessionTime),
        maxSessionTime: format(criteria.maxSessionTime),
        sessionCooldown: format(criteria.sessionCooldown),
        mergeGap: format(criteria.mergeGap),
        sessions: criteria.sessions,
        gexp: criteria.gexp,
        playtime: criteria.playtime === null ? null : format(criteria.playtime),
        match: criteria.match
    }
}

async function resolvePlayer(username) {
    const data = UuidAndRanksHandler.loadExisting()
    const key = UuidAndRanksHandler.findKey(data, username)
    if (key && data[key].uuid) return { uuid: data[key].uuid, name: key }

    const givenUuid = parseUuid(username)
    if (givenUuid) return lookupUuid(givenUuid, data)
    if (!isValidName(username)) return null

    const [profile] = await UuidAndRanksHandler.fetchBatch([username])
    if (!profile) return null

    const uuid = UuidAndRanksHandler.formatUUID(profile.id)
    const knownKey = Object.keys(data).find(k => data[k]?.uuid === uuid)
    return { uuid, name: knownKey ?? profile.name }
}

async function getActivityReport(app, args) {
    const { criteria, errors, capped } = ActivityCheckHandler.parseCriteria(args, ActivitySettingsHandler.getDefaults())
    if (errors.length) return { errors }

    const guild = await GuildSyncHandler.syncGuild(app)
    const result = ActivityCheckHandler.checkActivity(guild, criteria, {
        lobbyHolder: app.config.minecraft.lobbyHolder,
        exemptions: ActivitySettingsHandler.getExemptions()
    })

    return {
        errors: [],
        ...result,
        capped,
        labels: activityLabels(criteria)
    }
}

function getActivityDefaults() {
    const { criteria } = ActivityCheckHandler.parseCriteria([], ActivitySettingsHandler.getDefaults())
    return activityLabels(criteria)
}

function setActivityDefaults(args) {
    const { criteria, errors } = ActivityCheckHandler.parseCriteria(args, ActivitySettingsHandler.getDefaults())
    if (errors.length) return { errors }

    ActivitySettingsHandler.setDefaults(criteria)
    return { errors: [], labels: activityLabels(criteria) }
}

function resetActivityDefaults() {
    ActivitySettingsHandler.resetDefaults()
    return getActivityDefaults()
}

async function addExemption(username, durationText, reason, by) {
    const seconds = ActivityCheckHandler.parseDuration(durationText ?? "", "d")
    if (!seconds) return { error: `Couldn't read \`${durationText ?? ""}\` as a duration (try \`2w\`, \`10d\`, \`1M\`)` }

    const player = await resolvePlayer(username)
    if (!player) return { error: `Couldn't find a player called **${username}**.` }

    const now = Math.floor(Date.now() / 1000)
    const exemption = { name: player.name, until: now + seconds, reason: reason || null, by, added: now }
    ActivitySettingsHandler.addExemption(player.uuid, exemption)

    return { name: player.name, exemption, duration: ActivityCheckHandler.formatDuration(seconds) }
}

async function removeExemption(username) {
    const exemptions = ActivitySettingsHandler.getExemptions()
    const lower = username.toLowerCase()
    let uuid = Object.keys(exemptions).find(u => exemptions[u].name.toLowerCase() === lower)
    let name = uuid ? exemptions[uuid].name : username

    if (!uuid) {
        const player = await resolvePlayer(username)
        if (player) {
            uuid = player.uuid
            name = player.name
        }
    }

    return { name, removed: uuid ? ActivitySettingsHandler.removeExemption(uuid) : false }
}

function listExemptions() {
    const data = UuidAndRanksHandler.loadExisting()
    const nameByUuid = new Map(Object.entries(data).filter(([, r]) => r?.uuid).map(([k, r]) => [r.uuid, k]))

    return Object.entries(ActivitySettingsHandler.getExemptions())
        .map(([uuid, e]) => ({ ...e, name: nameByUuid.get(uuid) ?? e.name }))
        .sort((a, b) => a.until - b.until)
}

async function banPlayer(username, reason, by) {
    const player = await resolvePlayer(username)
    if (!player) return null

    const now = Math.floor(Date.now() / 1000)
    const previous = presentBan(BanListHandler.getBan(player.uuid), player.uuid, player.name)
    const ban = { name: player.name, reason: reason || null, by, at: now }
    BanListHandler.addBan(player.uuid, ban, { unbannedAt: now, unbannedBy: by, unbanReason: "Replaced by a new ban" })
    BanListHandler.noteName(player.uuid, player.name)

    return { ...player, ban: presentBan(ban, player.uuid, player.name), previous, history: BanListHandler.getHistory(player.uuid).map(entry => presentBan(entry, player.uuid, player.name)) }
}

async function unbanPlayer(username, reason, by) {
    const bans = BanListHandler.listBans()
    const lower = username.toLowerCase()
    let uuid = Object.keys(bans).find(u => [bans[u].name, ...BanListHandler.getUsernames(u)].some(n => n?.toLowerCase() === lower))
    if (!uuid && bans[parseUuid(username)]) uuid = parseUuid(username)

    let currentName = null
    if (!uuid) {
        const player = await resolvePlayer(username)
        uuid = player?.uuid
        currentName = player?.name ?? null
    }

    const unban = { unbannedAt: Math.floor(Date.now() / 1000), unbannedBy: by, unbanReason: reason || null }
    const removed = presentBan(uuid ? BanListHandler.removeBan(uuid, unban) : null, uuid, currentName ?? undefined)
    return { name: removed?.name ?? username, uuid, removed: removed ? { ...removed, ...unban } : null }
}

async function checkBan(username) {
    const player = await resolvePlayer(username)
    if (!player) return null
    BanListHandler.noteName(player.uuid, player.name)
    const ban = presentBan(BanListHandler.getBan(player.uuid), player.uuid, player.name)
    return ban ? { ...player, ban, history: BanListHandler.getHistory(player.uuid).map(entry => presentBan(entry, player.uuid, player.name)).reverse() } : null
}

function getBanByUuid(uuid) {
    return BanListHandler.getBan(uuid)
}

function getBanHistoryByUuid(uuid) {
    return BanListHandler.getHistory(uuid)
}

function nameLookup() {
    const data = UuidAndRanksHandler.loadExisting()
    return new Map(Object.entries(data).filter(([, r]) => r?.uuid).map(([k, r]) => [r.uuid, k]))
}

function listBans() {
    const nameByUuid = nameLookup()
    return Object.entries(BanListHandler.listBans())
        .map(([uuid, ban]) => ({ ...presentBan(ban, uuid, nameByUuid.get(uuid)), uuid }))
        .sort((a, b) => b.at - a.at)
}

function listFormerBans() {
    const nameByUuid = nameLookup()
    return BanListHandler.listHistory()
        .reverse()
        .map(entry => presentBan(entry, entry.uuid, nameByUuid.get(entry.uuid)))
        .sort((a, b) => b.unbannedAt - a.unbannedAt)
}

async function getPlayerBanRecord(username) {
    const lower = username.toLowerCase()
    const givenUuid = parseUuid(username)
    const known = [...listBans(), ...listFormerBans()].find(entry => entry.uuid === givenUuid || [entry.name, entry.bannedAs, ...entry.usernames].some(n => n?.toLowerCase() === lower))
    const player = known ? { uuid: known.uuid, name: known.name } : await resolvePlayer(username)
    if (!player) return null
    BanListHandler.noteName(player.uuid, player.name)

    return {
        ...player,
        usernames: BanListHandler.getUsernames(player.uuid),
        ban: presentBan(BanListHandler.getBan(player.uuid), player.uuid, player.name),
        history: listFormerBans().filter(entry => entry.uuid === player.uuid).map(entry => ({ ...entry, name: player.name }))
    }
}

module.exports = {
    parseUuid,
    resolvePlayer,
    banPlayer,
    unbanPlayer,
    checkBan,
    getBanByUuid,
    getBanHistoryByUuid,
    listBans,
    listFormerBans,
    getPlayerBanRecord,
    startGuildSync,
    getActivityReport,
    getActivityDefaults,
    setActivityDefaults,
    resetActivityDefaults,
    addExemption,
    removeExemption,
    listExemptions,
    getGuild,
    getMemberInfo,
    playerJoin,
    playerLeave,
    ensureUser,
    playerGuildMotion,
    playerGuildNew
}