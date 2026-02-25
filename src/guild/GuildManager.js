const UuidAndRanksHandler = require("./handlers/UuidAndRanksHandler.js")
const SessionsHandler = require("./handlers/SessionsHandler.js")

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

async function syncPlayers(players) {
    if (!players || players.length === 0) return
    await UuidAndRanksHandler.syncUuidAndRanks(players)
}

async function loadPlayers(gr, gm) {
    const guildRanks = gr.slice(0 , -1).split(",")
    const guildMembers = gm.slice(0 , -1).split(",")

    const regex = /(?:\[(.*?)\])?\s*([^\s●]+)\s*●/g

    for (let i = 0; i < guildRanks.length; i++) {

        const currentGuildRank = guildRanks[i].trim()
        const memberBlock = guildMembers[i]

        const players = [...memberBlock.matchAll(regex)].map(m => ({
            username: m[2],
            hypixel_rank: m[1] || "Non",
            guild_rank: currentGuildRank
        }))

        await syncPlayers(players)
    }
}

module.exports = {
    playerJoin,
    playerLeave,
    syncPlayers,
    ensureUser,
    loadPlayers,
    playerGuildMotion,
    playerGuildNew
}