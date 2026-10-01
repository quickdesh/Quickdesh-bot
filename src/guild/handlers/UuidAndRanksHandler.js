const fs = require("fs")

const FILE_PATH = "./AspectOfTheEgg.json"
const BATCH_SIZE = 10
const DELAY_MS = 2000
const VALID_NAME = /^[A-Za-z0-9_]{3,16}$/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function loadExisting() {
    if (!fs.existsSync(FILE_PATH)) return {}
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
}

function save(data) {
    const json = JSON.stringify(data, null, 2).replace(
        /"last_sessions": (\[[^\]]*\])/g,
        (_, sessions) => `"last_sessions": ${JSON.stringify(JSON.parse(sessions))}`
    )
    fs.writeFileSync(FILE_PATH + ".tmp", json)
    fs.renameSync(FILE_PATH + ".tmp", FILE_PATH)
}

function formatUUID(raw) {
    return raw.replace(
        /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
        "$1-$2-$3-$4-$5"
    )
}

function findKey(data, name) {
    if (typeof name !== "string") return null
    const lower = name.toLowerCase()
    return Object.keys(data).find(key => key.toLowerCase() === lower) ?? null
}

async function fetchBatch(usernames) {
    const res = await fetch(
        "https://api.mojang.com/profiles/minecraft",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usernames)
        }
    )

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
    }

    return await res.json()
}

async function fetchNameByUuid(uuid) {
    const res = await fetch(
        `https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, "")}`
    )

    if (res.status === 204 || res.status === 404) return null

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
    }

    return (await res.json()).name
}

async function syncUuidAndRanks(input) {

    const players = input.map(item =>
        typeof item === "string"
            ? { username: item, ranksProvided: false }
            : {
                username: item.username,
                hypixel_rank: item.hypixel_rank ?? "Non",
                guild_rank: item.guild_rank ?? "Raw Egg",
                ranksProvided: true
              }
    )

    const namesToFetch = [...new Set(
        players
            .map(p => p.username)
            .filter(name => typeof name === "string" && VALID_NAME.test(name))
    )]

    const profiles = []
    const confirmed = new Set()

    for (let i = 0; i < namesToFetch.length; i += BATCH_SIZE) {

        const batch = namesToFetch.slice(i, i + BATCH_SIZE)
        console.log(`\nFetching batch: ${batch.join(", ")}`)

        try {
            const results = await fetchBatch(batch)
            for (const profile of results) {
                profiles.push({ uuid: formatUUID(profile.id), name: profile.name })
            }
            batch.forEach(name => confirmed.add(name.toLowerCase()))
        } catch (err) {
            console.error("Batch failed:", err.message)
        }

        if (i + BATCH_SIZE < namesToFetch.length) {
            console.log(`Waiting ${DELAY_MS}ms...`)
            await sleep(DELAY_MS)
        }
    }

    const uuidByName = new Map(profiles.map(p => [p.name.toLowerCase(), p.uuid]))

    function staleKeys(data) {
        return Object.keys(data).filter(key =>
            confirmed.has(key.toLowerCase()) &&
            data[key]?.uuid &&
            uuidByName.get(key.toLowerCase()) !== data[key].uuid
        )
    }

    const snapshot = loadExisting()
    const currentNames = new Map()

    for (const key of staleKeys(snapshot)) {
        const uuid = snapshot[key].uuid
        try {
            currentNames.set(uuid, await fetchNameByUuid(uuid))
        } catch (err) {
            console.error(`UUID lookup failed for ${key}:`, err.message)
        }
    }

    const existing = loadExisting()
    const uuidToName = {}

    for (const [name, data] of Object.entries(existing)) {
        if (data?.uuid) {
            uuidToName[data.uuid] = name
        }
    }

    function moveRecord(fromKey, toKey) {

        const record = existing[fromKey]

        const oldNames = Array.isArray(record["Old names"])
            ? [...record["Old names"]]
            : []

        const isRealRename =
            fromKey !== record.uuid &&
            fromKey.toLowerCase() !== toKey.toLowerCase()

        if (isRealRename && !oldNames.includes(fromKey)) {
            oldNames.push(fromKey)
        }

        delete existing[fromKey]
        existing[toKey] = { ...record }
        if (oldNames.length) existing[toKey]["Old names"] = oldNames

        uuidToName[record.uuid] = toKey
    }

    function displace(key) {

        const { uuid } = existing[key]
        const newName = currentNames.get(uuid)

        if (newName && !findKey(existing, newName)) {
            console.log(`🔁 Username change detected: ${key} → ${newName}`)
            moveRecord(key, newName)
        } else {
            console.warn(`⚠️ ${key} no longer owns that name, parked under ${uuid}`)
            moveRecord(key, uuid)
        }
    }

    for (const key of staleKeys(existing)) {
        displace(key)
    }

    for (const { uuid, name } of profiles) {

        const holderKey = uuidToName[uuid]

        if (holderKey && existing[holderKey]?.uuid === uuid) {

            if (holderKey !== name) {
                console.log(`🔁 Username change detected: ${holderKey} → ${name}`)
                moveRecord(holderKey, name)
            }

        } else {

            console.log(`➕ Adding new: ${name}`)

            const prevKey = findKey(existing, name)
            existing[name] = {
                ...(prevKey ? existing[prevKey] : {}),
                uuid
            }
            if (prevKey && prevKey !== name) delete existing[prevKey]

            uuidToName[uuid] = name
        }
    }

    for (const player of players) {

        const { username, hypixel_rank, guild_rank, ranksProvided } = player

        const key = findKey(existing, username)
        if (!key) continue

        if (ranksProvided) {
            existing[key].hypixel_rank = hypixel_rank
            existing[key].guild_rank = guild_rank
        } else {
            existing[key].hypixel_rank ??= "Non"
            existing[key].guild_rank ??= "Raw Egg"
        }
    }

    save(existing)
    console.log("\n✅ UUID + rank sync complete.")

    return confirmed
}

module.exports = { syncUuidAndRanks, findKey }