const fs = require("fs")

const FILE_PATH = "./BanList.json"

function load() {
    if (!fs.existsSync(FILE_PATH)) return {}
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8")).bans || {}
}

function save(bans) {
    fs.writeFileSync(FILE_PATH + ".tmp", JSON.stringify({ bans }, null, 2))
    fs.renameSync(FILE_PATH + ".tmp", FILE_PATH)
}

function getBan(uuid) {
    return load()[uuid] ?? null
}

function addBan(uuid, ban) {
    const bans = load()
    bans[uuid] = ban
    save(bans)
}

function removeBan(uuid) {
    const bans = load()
    if (!bans[uuid]) return null
    const removed = bans[uuid]
    delete bans[uuid]
    save(bans)
    return removed
}

function listBans() {
    return load()
}

module.exports = { getBan, addBan, removeBan, listBans }
