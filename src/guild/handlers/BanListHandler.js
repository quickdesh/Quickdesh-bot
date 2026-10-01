const fs = require("fs")

const FILE_PATH = "./BanList.json"

function load() {
    if (!fs.existsSync(FILE_PATH)) return { bans: {}, history: [] }
    const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
    return { bans: data.bans || {}, history: data.history || [] }
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

module.exports = { getBan, addBan, removeBan, listBans, listHistory, getHistory }
