const fs = require("fs")
const { syncUUIDs } = require("./UuidAndRanksHandler.js")

const FILE_PATH = "./AspectOfTheEgg.json"

const TEN_MINUTES = 300
const SIXTY_DAYS = 60 * 24 * 60 * 60

function load() {
    if (!fs.existsSync(FILE_PATH)) return {}
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
}

function save(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2))
}

async function ensureUserExists(username) {

    let data = load()

    if (data[username]) return data

    console.log(`User ${username} not found. Syncing UUID...`)

    await syncUUIDs([username])

    data = load()

    if (!data[username]) {
        console.warn(`Failed to sync UUID for ${username}`)
        return null
    }

    return data
}

function cleanupOldSessions(sessions, currentUnix) {
    const cutoff = currentUnix - SIXTY_DAYS
    return sessions.filter(s => s.join >= cutoff)
}

async function recordJoin(username, unixTime) {

    let data = await ensureUserExists(username)
    if (!data) return

    if (!Array.isArray(data[username].last_sessions)) {
        data[username].last_sessions = []
    }

    data[username].last_sessions =
        cleanupOldSessions(data[username].last_sessions, unixTime)

    const sessions = data[username].last_sessions
    const last = sessions[sessions.length - 1]

    if (last) {

        if (last.leave === 0) {
            save(data)
            return
        }

        if (unixTime - last.leave < TEN_MINUTES) {
            last.leave = 0
            save(data)
            return
        }
    }

    sessions.push({
        join: unixTime,
        leave: 0
    })

    save(data)
}

async function recordLeave(username, unixTime) {

    let data = await ensureUserExists(username)
    if (!data) return

    if (!Array.isArray(data[username].last_sessions)) {
        data[username].last_sessions = []
    }

    const sessions = data[username].last_sessions

    if (sessions.length === 0) {
        save(data)
        return
    }

    const last = sessions[sessions.length - 1]

    if (last.leave === 0) {
        last.leave = unixTime
    } else {
        last.leave = -1
    }

    save(data)
}

module.exports = { recordJoin, recordLeave }