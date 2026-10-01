const { loadExisting } = require("./UuidAndRanksHandler.js")
const ActivitySettingsHandler = require("./ActivitySettingsHandler.js")

const DAY = 24 * 60 * 60
const MAX_WINDOW = 180 * DAY

const DEFAULTS = {
    time: 30 * DAY,
    sessions: 10,
    minSessionTime: 30 * 60,
    maxSessionTime: 4 * 60 * 60,
    sessionCooldown: 12 * 60 * 60,
    mergeGap: 10 * 60,
    gexp: null,
    playtime: null,
    match: "any"
}

const UNITS = {
    m: 60,
    h: 60 * 60,
    d: DAY,
    w: 7 * DAY,
    M: 30 * DAY,
    mo: 30 * DAY,
    y: 365 * DAY
}

const KEYS = {
    time: "time",
    period: "time",
    t: "time",
    sessions: "sessions",
    minsessions: "sessions",
    s: "sessions",
    sessionmintime: "minSessionTime",
    sessionmin: "minSessionTime",
    minsession: "minSessionTime",
    minsessiontime: "minSessionTime",
    min: "minSessionTime",
    sessionmaxtime: "maxSessionTime",
    sessionmax: "maxSessionTime",
    maxsession: "maxSessionTime",
    maxsessiontime: "maxSessionTime",
    max: "maxSessionTime",
    sessioncooldown: "sessionCooldown",
    cooldown: "sessionCooldown",
    cd: "sessionCooldown",
    mergegap: "mergeGap",
    merge: "mergeGap",
    gap: "mergeGap",
    gexp: "gexp",
    gxp: "gexp",
    playtime: "playtime",
    pt: "playtime",
    hours: "playtime",
    match: "match",
    mode: "match"
}

const OFF = ["off", "none", "0"]
const MATCH = { any: "any", or: "any", all: "all", and: "all" }

function parseAmount(text) {
    const match = /^(\d+(?:\.\d+)?)([kKmM])?$/.exec(text)
    if (!match) return null
    const multiplier = { k: 1e3, K: 1e3, m: 1e6, M: 1e6 }[match[2]] ?? 1
    return Math.round(Number(match[1]) * multiplier)
}

function parseDuration(text, defaultUnit) {
    const match = /^(\d+(?:\.\d+)?)(mo|[mhdwMy])?$/.exec(text)
    if (!match) return null
    return Math.round(Number(match[1]) * UNITS[match[2] ?? defaultUnit])
}

function parseCriteria(args, base = {}) {
    const criteria = { ...DEFAULTS, ...base }
    const errors = []

    for (const arg of args.filter(Boolean)) {
        const [rawKey, value] = arg.split("=")
        const key = KEYS[rawKey?.toLowerCase().replace(/[_-]/g, "")]

        if (!key || value === undefined || value === "") {
            errors.push(`Unknown option \`${arg}\``)
            continue
        }

        if (key === "match") {
            const mode = MATCH[value.toLowerCase()]
            if (!mode) errors.push(`\`match\` must be \`any\` or \`all\`, got \`${value}\``)
            else criteria.match = mode
        } else if (OFF.includes(value.toLowerCase()) && ["sessions", "gexp", "playtime"].includes(key)) {
            criteria[key] = null
        } else if (key === "sessions") {
            const count = Number(value)
            if (!Number.isInteger(count) || count < 0) errors.push(`\`sessions\` must be a whole number, got \`${value}\``)
            else criteria.sessions = count
        } else if (key === "gexp") {
            const amount = parseAmount(value)
            if (!amount) errors.push(`Couldn't read \`${value}\` as a GEXP amount (try \`50000\`, \`50k\`, \`1.5m\`)`)
            else criteria.gexp = amount
        } else if (key === "playtime") {
            const seconds = parseDuration(value, "h")
            if (!seconds) errors.push(`Couldn't read \`${value}\` as a playtime (try \`40h\`, \`2d\`)`)
            else criteria.playtime = seconds
        } else {
            const seconds = parseDuration(value, key === "time" ? "d" : key === "minSessionTime" || key === "mergeGap" ? "m" : "h")
            if (seconds === null || (seconds === 0 && key !== "mergeGap")) errors.push(`Couldn't read \`${value}\` as a duration (try \`2M\`, \`3w\`, \`30m\`)`)
            else criteria[key] = seconds
        }
    }

    if (!errors.length && criteria.maxSessionTime < criteria.minSessionTime) {
        errors.push("`session_max_time` can't be shorter than `session_min_time`")
    }

    if (!errors.length && criteria.sessions === null && criteria.gexp === null && criteria.playtime === null) {
        errors.push("At least one of `sessions`, `gexp` or `playtime` has to be on")
    }

    const capped = criteria.time > MAX_WINDOW
    if (capped) criteria.time = MAX_WINDOW

    return { criteria, errors, capped }
}

function getSessionRules() {
    return { ...DEFAULTS, ...ActivitySettingsHandler.getDefaults() }
}

function mergeSessions(sessions, gap) {
    const merged = []
    for (const session of [...sessions].sort((a, b) => a.join - b.join)) {
        const previous = merged[merged.length - 1]
        if (previous && previous.leave > 0 && session.join - previous.leave <= gap) {
            previous.leave = session.leave
        } else {
            merged.push({ ...session })
        }
    }
    return merged
}

function summarizeSessions(sessions, criteria, since, now = Math.floor(Date.now() / 1000)) {
    let count = 0
    let playtime = 0
    for (const session of mergeSessions(sessions, criteria.mergeGap)) {
        const result = countSession(session, criteria, since, now)
        count += result.count
        playtime += result.playtime
    }
    return { count, playtime }
}

function countSession(session, criteria, since, now) {
    if (session.leave === -1) {
        return session.join >= since ? { count: 1, playtime: 0 } : { count: 0, playtime: 0 }
    }

    if (session.leave === 0) {
        if (session.join < since) return { count: 0, playtime: 0 }
        const length = Math.min(now - session.join, criteria.maxSessionTime)
        return length >= criteria.minSessionTime ? { count: 1, playtime: length } : { count: 0, playtime: 0 }
    }

    let count = 0
    let playtime = 0

    for (let start = session.join; start < session.leave; start += criteria.sessionCooldown) {
        if (start < since) continue
        const block = Math.min(session.leave, start + criteria.sessionCooldown) - start
        const length = Math.min(block, criteria.maxSessionTime)
        if (length < criteria.minSessionTime) continue
        count++
        playtime += length
    }

    return { count, playtime }
}

function trackingStart(data) {
    let earliest = null
    for (const record of Object.values(data)) {
        const first = Array.isArray(record?.last_sessions) ? record.last_sessions[0] : null
        if (first && (earliest === null || first.join < earliest)) earliest = first.join
    }
    return earliest
}

function gexpTrackingStart(data) {
    let earliest = null
    for (const record of Object.values(data)) {
        for (const date of Object.keys(record?.gexp_history || {})) {
            if (earliest === null || date < earliest) earliest = date
        }
    }
    return earliest === null ? null : Math.floor(Date.parse(`${earliest}T00:00:00Z`) / 1000)
}

function requirementResults(entry, criteria) {
    const results = []
    if (criteria.sessions !== null) results.push(entry.count >= criteria.sessions)
    if (criteria.gexp !== null) results.push(entry.gexp >= criteria.gexp)
    if (criteria.playtime !== null) results.push(entry.playtime >= criteria.playtime)
    return results
}

function isActive(entry, criteria) {
    const results = requirementResults(entry, criteria)
    return criteria.match === "all" ? results.every(Boolean) : results.some(Boolean)
}

function gexpSince(record, since) {
    const sinceDate = new Date(since * 1000).toISOString().slice(0, 10)
    return Object.entries(record?.gexp_history || {})
        .filter(([date]) => date >= sinceDate)
        .reduce((sum, [, xp]) => sum + xp, 0)
}

function checkActivity(guild, criteria, { lobbyHolder, exemptions = {} } = {}) {
    const data = loadExisting()
    const now = Math.floor(Date.now() / 1000)
    const since = now - criteria.time

    const active = []
    const inactive = []
    const exempt = []

    for (const member of guild.members) {
        if (lobbyHolder && member.name.toLowerCase() === lobbyHolder.toLowerCase()) continue

        const record = data[member.name]
        const sessions = Array.isArray(record?.last_sessions) ? record.last_sessions : []

        const { count, playtime } = summarizeSessions(sessions, criteria, since, now)

        const entry = {
            name: member.name,
            count,
            playtime,
            gexp: gexpSince(record, since),
            isNew: member.joined !== null && member.joined > since,
            rank: member.rank ?? null
        }

        const exemption = exemptions[member.uuid]
        if (exemption) exempt.push({ ...entry, exemption })
        else if (isActive(entry, criteria)) active.push(entry)
        else inactive.push(entry)
    }

    const rankOrder = new Map((guild.ranks ?? []).map((rank, i) => [rank, i]))
    const rankIndex = entry => rankOrder.get(entry.rank) ?? rankOrder.size

    active.sort((a, b) =>
        rankIndex(a) - rankIndex(b) ||
        b.count - a.count ||
        b.playtime - a.playtime ||
        b.gexp - a.gexp ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
    inactive.sort((a, b) =>
        rankIndex(a) - rankIndex(b) ||
        a.count - b.count ||
        a.playtime - b.playtime ||
        a.gexp - b.gexp ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
    exempt.sort((a, b) =>
        rankIndex(a) - rankIndex(b) ||
        a.exemption.until - b.exemption.until ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )

    return { active, inactive, exempt, trackingSince: trackingStart(data), gexpSince: gexpTrackingStart(data), since }
}

function formatDuration(seconds) {
    const units = [["y", 365 * DAY], ["M", 30 * DAY], ["w", 7 * DAY], ["d", DAY], ["h", 3600], ["m", 60]]
    for (const [unit, size] of units) {
        if (seconds >= size && seconds % size === 0) return `${seconds / size}${unit}`
    }
    return `${Math.round(seconds / 60)}m`
}

module.exports = { parseCriteria, parseDuration, checkActivity, summarizeSessions, getSessionRules, formatDuration, DEFAULTS }
