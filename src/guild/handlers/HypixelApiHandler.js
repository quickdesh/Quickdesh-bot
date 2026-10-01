async function hypixelGet(path, apiKey) {
    const res = await fetch(`https://api.hypixel.net/v2/${path}`, {
        headers: { "API-Key": apiKey }
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data.success) {
        throw new Error(data.cause || `Hypixel API error (HTTP ${res.status})`)
    }

    return data
}

async function fetchGuildByName(name, apiKey) {
    const data = await hypixelGet(`guild?name=${encodeURIComponent(name)}`, apiKey)
    return data.guild || null
}

module.exports = { hypixelGet, fetchGuildByName }
