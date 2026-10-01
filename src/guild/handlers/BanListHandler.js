const fs = require("fs")

const FILE_PATH = "./BanList.json"

function load() {
    if (!fs.existsSync(FILE_PATH)) return { bans: {}, history: [], usernames: {} }
    const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
    return { bans: data.bans || {}, history: data.history || [], usernames: data.usernames || {} }
}

function save(data) {
    fs.writeFileSync(FILE_PATH + ".tmp", JSON.stringify(data, null, 2))
    fs.renameSync(FILE_PATH + ".tmp", FILE_PATH)
}

function getBan(uuid) {
    return load().bans[uuid] ?? null
}

function addBan(uuid, ban, replaced = null) {
    const data = load()
    if (data.bans[uuid] && replaced) data.history.push({ uuid, ...data.bans[uuid], ...replaced })
    data.bans[uuid] = ban
    save(data)
}

function removeBan(uuid, unban) {
    const data = load()
    if (!data.bans[uuid]) return null
    const removed = data.bans[uuid]
    data.history.push({ uuid, ...removed, ...unban })
    delete data.bans[uuid]
    save(data)
    return removed
}

function listBans() {
    return load().bans
}

function listHistory() {
    return load().history
}

function getHistory(uuid) {
    return load().history.filter(entry => entry.uuid === uuid)
}

function seedUsernames(data, uuid) {
    const entries = [...data.history.filter(h => h.uuid === uuid), ...(data.bans[uuid] ? [data.bans[uuid]] : [])]
    const names = []
    for (const entry of entries.sort((a, b) => a.at - b.at)) {
        if (entry.name && !names.some(n => n.toLowerCase() === entry.name.toLowerCase())) names.push(entry.name)
    }
    return names
}

function getUsernames(uuid) {
    const data = load()
    return data.usernames[uuid] ?? seedUsernames(data, uuid)
}

function getAllUsernames() {
    return load().usernames
}

function noteName(uuid, name) {
    if (!uuid || !name) return
    const data = load()
    if (!data.bans[uuid] && !data.history.some(h => h.uuid === uuid)) return

    const names = data.usernames[uuid] ?? seedUsernames(data, uuid)
    if (data.usernames[uuid] && names[names.length - 1]?.toLowerCase() === name.toLowerCase()) return

    data.usernames[uuid] = [...names.filter(n => n.toLowerCase() !== name.toLowerCase()), name]
    save(data)
}

module.exports = { getBan, addBan, removeBan, listBans, listHistory, getHistory, getUsernames, getAllUsernames, noteName }
