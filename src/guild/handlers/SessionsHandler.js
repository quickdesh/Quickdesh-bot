const fs = require("fs")
const { syncUuidAndRanks, findKey } = require("./UuidAndRanksHandler.js")

const FILE_PATH = "./AspectOfTheEgg.json"

const TEN_MINUTES = 600
const ONE_HUNDRED_EIGHTY_DAYS = 180 * 24 * 60 * 60

const UUID_RECHECK_MS = 5 * 60 * 1000
const lastUuidCheck = new Map()

function load() {
    if (!fs.existsSync(FILE_PATH)) return {}
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
}

function save(data) {
    fs.writeFileSync(FILE_PATH + ".tmp", JSON.stringify(data, null, 2))
    fs.renameSync(FILE_PATH + ".tmp", FILE_PATH)
}

async function ensureUserExists(username) {

    const lower = String(username).toLowerCase()
    const lastCheck = lastUuidCheck.get(lower)

    if (lastCheck === undefined || Date.now() - lastCheck >= UUID_RECHECK_MS) {
        const confirmed = await syncUuidAndRanks([username])
        if (confirmed.has(lower)) lastUuidCheck.set(lower, Date.now())
    }

    const data = load()
    const key = findKey(data, username)

    if (!key) {
        console.warn(`Failed to sync UUID for ${username}`)
        return null
    }

    return { data, key }
}

function cleanupOldSessions(sessions, currentUnix) {
    const cutoff = currentUnix - ONE_HUNDRED_EIGHTY_DAYS
    return sessions.filter(s => s.join >= cutoff)
}

async function recordJoin(username, unixTime) {

    const user = await ensureUserExists(username)
    if (!user) return

    const { data, key } = user

    if (!Array.isArray(data[key].last_sessions)) {
        data[key].last_sessions = []
    }

    data[key].last_sessions =
        cleanupOldSessions(data[key].last_sessions, unixTime)

    const sessions = data[key].last_sessions
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

    const user = await ensureUserExists(username)
    if (!user) return

    const { data, key } = user

    if (!Array.isArray(data[key].last_sessions)) {
        data[key].last_sessions = []
    }

    const sessions = data[key].last_sessions

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