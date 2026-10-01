const cron = require("node-cron")
const { syncUuidAndRanks, fetchNameByUuid, formatUUID, loadExisting, save } = require("./UuidAndRanksHandler.js")
const { fetchGuildByName } = require("./HypixelApiHandler.js")

const HISTORY_DAYS = 180

let dailyTask = null

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

async function syncGuildExp(apiKey, guildName) {

    const guild = await fetchGuildByName(guildName, apiKey)
    if (!guild) throw new Error(`Guild "${guildName}" not found`)

    const members = (guild.members || []).map(m => ({
        uuid: formatUUID(m.uuid),
        rank: m.rank,
        expHistory: m.expHistory || {}
    }))

    const known = uuidIndex(loadExisting())
    const newPlayers = []

    for (const member of members.filter(m => !known.has(m.uuid))) {
        try {
            const name = await fetchNameByUuid(member.uuid)
            if (name) newPlayers.push({ username: name, guild_rank: member.rank })
        } catch (err) {
            console.warn(`GEXP: name lookup failed for ${member.uuid}: ${err.message}`)
        }
    }

    if (newPlayers.length) await syncUuidAndRanks(newPlayers)

    const data = loadExisting()
    const index = uuidIndex(data)
    const cutoff = cutoffDate()
    let updated = 0

    for (const member of members) {
        const key = index.get(member.uuid)
        if (!key) continue

        data[key].gexp_history = {
            ...(data[key].gexp_history || {}),
            ...member.expHistory
        }
        updated++
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

    return { members: members.length, updated, added: newPlayers.length }
}

function start(app) {

    if (dailyTask) return

    const apiKey = app.config.hypixel.apiKey
    const guildName = app.config.hypixel.guildName || app.config.discord.guildname

    if (!apiKey || !guildName) {
        app.log.warn("GEXP sync disabled: set hypixel.apiKey and discord.guildname in config.json")
        return
    }

    const run = async () => {
        try {
            const result = await syncGuildExp(apiKey, guildName)
            app.log.broadcast(`Saved GEXP for ${result.updated}/${result.members} members (${result.added} new)`, "GEXP")
        } catch (err) {
            app.log.error(`GEXP sync failed: ${err.message}`)
        }
    }

    run()

    dailyTask = cron.schedule("30 0 * * *", run, { timezone: "America/New_York" })
}

module.exports = { start, syncGuildExp }
