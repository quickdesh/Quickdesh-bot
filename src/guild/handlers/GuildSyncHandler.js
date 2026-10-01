const cron = require("node-cron")
const { syncUuidAndRanks, fetchNameByUuid, formatUUID, loadExisting, save } = require("./UuidAndRanksHandler.js")
const { fetchGuildByName } = require("./HypixelApiHandler.js")

const HISTORY_DAYS = 180
const CACHE_MS = 60 * 1000

let dailyTask = null
let lastSync = null
let inFlight = null

function cutoffDate() {
    return new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function uuidIndex(data) {
    const index = new Map()
    for (const [key, record] of Object.entries(data)) {
        if (record?.uuid) index.set(record.uuid, key)
    }
    return index
}

function guildConfig(app) {
    return {
        apiKey: app.config.hypixel.apiKey,
        guildName: app.config.hypixel.guildName || app.config.discord.guildname
    }
}

async function runSync(apiKey, guildName) {

    const guild = await fetchGuildByName(guildName, apiKey)
    if (!guild) throw new Error(`Guild "${guildName}" not found`)

    const apiMembers = (guild.members || []).map(m => ({
        uuid: formatUUID(m.uuid),
        rank: m.rank,
        joined: m.joined ? Math.floor(m.joined / 1000) : null,
        expHistory: m.expHistory || {}
    }))

    const known = uuidIndex(loadExisting())
    const newPlayers = []

    for (const member of apiMembers.filter(m => !known.has(m.uuid))) {
        try {
            const name = await fetchNameByUuid(member.uuid)
            if (name) newPlayers.push({ username: name, guild_rank: member.rank })
        } catch (err) {
            console.warn(`Guild sync: name lookup failed for ${member.uuid}: ${err.message}`)
        }
    }

    if (newPlayers.length) await syncUuidAndRanks(newPlayers)

    const data = loadExisting()
    const index = uuidIndex(data)
    const cutoff = cutoffDate()
    const members = []

    for (const member of apiMembers) {
        const key = index.get(member.uuid)
        if (!key) continue

        data[key].guild_rank = member.rank
        data[key].gexp_history = {
            ...(data[key].gexp_history || {}),
            ...member.expHistory
        }

        members.push({ ...member, name: key, hypixelRank: data[key].hypixel_rank })
    }

    for (const record of Object.values(data)) {
        if (!record?.gexp_history) continue

        record.gexp_history = Object.fromEntries(
            Object.entries(record.gexp_history)
                .filter(([date]) => date >= cutoff)
                .sort(([a], [b]) => b.localeCompare(a))
        )
    }

    save(data)

    const ranks = [
        { name: "Guild Master", priority: Infinity },
        ...(guild.ranks || [])
    ].sort((a, b) => b.priority - a.priority)

    return {
        name: guild.name,
        ranks: ranks.map(r => r.name),
        members,
        totalMembers: apiMembers.length,
        added: newPlayers.length
    }
}

async function syncGuild(app, { force = false } = {}) {

    const { apiKey, guildName } = guildConfig(app)
    if (!apiKey || !guildName) {
        throw new Error("Set hypixel.apiKey and discord.guildname in config.json")
    }

    if (!force && lastSync && Date.now() - lastSync.time < CACHE_MS) {
        return lastSync.guild
    }

    if (!inFlight) {
        inFlight = runSync(apiKey, guildName)
            .then(guild => {
                lastSync = { time: Date.now(), guild }
                return guild
            })
            .finally(() => {
                inFlight = null
            })
    }

    return inFlight
}

function start(app) {

    if (dailyTask) return

    const { apiKey, guildName } = guildConfig(app)
    if (!apiKey || !guildName) {
        app.log.warn("Guild sync disabled: set hypixel.apiKey and discord.guildname in config.json")
        return
    }

    const run = async () => {
        try {
            const guild = await syncGuild(app, { force: true })
            app.log.broadcast(`Synced ${guild.members.length}/${guild.totalMembers} members (${guild.added} new)`, "Guild Sync")
        } catch (err) {
            app.log.error(`Guild sync failed: ${err.message}`)
        }
    }

    run()

    dailyTask = cron.schedule("30 0 * * *", run, { timezone: "America/New_York" })
}

module.exports = { start, syncGuild }
