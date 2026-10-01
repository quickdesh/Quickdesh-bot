const UuidAndRanksHandler = require("./handlers/UuidAndRanksHandler.js")
const SessionsHandler = require("./handlers/SessionsHandler.js")
const GuildSyncHandler = require("./handlers/GuildSyncHandler.js")
const { getPlayerStats } = require("./handlers/HypixelStatsHandler.js")

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

async function getMemberInfo(app, username) {

    const data = UuidAndRanksHandler.loadExisting()
    let key = UuidAndRanksHandler.findKey(data, username)
    let uuid = key ? data[key].uuid : null
    let name = key

    if (!uuid) {
        const [profile] = await UuidAndRanksHandler.fetchBatch([username])
        if (!profile) return null

        uuid = UuidAndRanksHandler.formatUUID(profile.id)
        name = profile.name
        key = Object.keys(data).find(k => data[k]?.uuid === uuid) ?? null
    }

    const stats = await getPlayerStats(uuid, app.config.hypixel.apiKey)

    return {
        name: key ?? name,
        member: key ? data[key] : null,
        stats
    }
}

module.exports = {
    startGuildSync,
    getGuild,
    getMemberInfo,
    playerJoin,
    playerLeave,
    ensureUser,
    playerGuildMotion,
    playerGuildNew
}