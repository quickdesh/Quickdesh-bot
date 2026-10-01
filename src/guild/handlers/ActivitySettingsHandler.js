const fs = require("fs")

const FILE_PATH = "./ActivitySettings.json"

function load() {
    if (!fs.existsSync(FILE_PATH)) return { defaults: {}, exemptions: {} }
    const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
    return {
        defaults: data.defaults || {},
        exemptions: data.exemptions || {}
    }
}

function save(data) {
    fs.writeFileSync(FILE_PATH + ".tmp", JSON.stringify(data, null, 2))
    fs.renameSync(FILE_PATH + ".tmp", FILE_PATH)
}

function getDefaults() {
    return load().defaults
}

function setDefaults(defaults) {
    const data = load()
    data.defaults = defaults
    save(data)
}

function resetDefaults() {
    const data = load()
    data.defaults = {}
    save(data)
}

function getExemptions() {
    const data = load()
    const now = Math.floor(Date.now() / 1000)
    const active = Object.fromEntries(
        Object.entries(data.exemptions).filter(([, e]) => e.until > now)
    )

    if (Object.keys(active).length !== Object.keys(data.exemptions).length) {
        data.exemptions = active
        save(data)
    }

    return active
}

function addExemption(uuid, exemption) {
    const data = load()
    data.exemptions[uuid] = exemption
    save(data)
}

function removeExemption(uuid) {
    const data = load()
    if (!data.exemptions[uuid]) return false
    delete data.exemptions[uuid]
    save(data)
    return true
}

module.exports = { getDefaults, setDefaults, resetDefaults, getExemptions, addExemption, removeExemption }
