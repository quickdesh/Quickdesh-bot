const fs = require("fs")

const FILE_PATH = "./AspectOfTheEgg.json"
const BATCH_SIZE = 10
const DELAY_MS = 2000

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function loadExisting() {
    if (!fs.existsSync(FILE_PATH)) return {}
    return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"))
}

function save(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2))
}

function formatUUID(raw) {
    return raw.replace(
        /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
        "$1-$2-$3-$4-$5"
    )
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

async function syncUuidAndRanks(input) {

    const existing = loadExisting()
    const uuidToName = {}
    const namesToFetch = []

    const players = input.map(item =>
        typeof item === "string"
            ? { username: item, hypixel_rank:"Non", guild_rank: "Raw Egg" }
            : {
                username: item.username,
                hypixel_rank: item.hypixel_rank ?? "Non",
                guild_rank: item.guild_rank ?? "Raw Egg"
              }
    )

    for (const [name, data] of Object.entries(existing)) {
        if (data?.uuid) {
            uuidToName[data.uuid] = name
        }
    }

    for (const player of players) {
        if (!existing[player.username]) {
            namesToFetch.push(player.username)
        }
    }

    for (let i = 0; i < namesToFetch.length; i += BATCH_SIZE) {

        const batch = namesToFetch.slice(i, i + BATCH_SIZE)
        console.log(`\nFetching batch: ${batch.join(", ")}`)

        let results = []
        try {
            results = await fetchBatch(batch)
        } catch (err) {
            console.error("Batch failed:", err.message)
        }

        for (const profile of results) {

            const formattedUUID = formatUUID(profile.id)
            const newName = profile.name

            if (uuidToName[formattedUUID]) {

                const oldName = uuidToName[formattedUUID]

                if (oldName !== newName) {

                    console.log(`🔁 Username change detected: ${oldName} → ${newName}`)

                    const oldData = existing[oldName] || {}

                    existing[newName] = {
                        ...oldData,
                        uuid: formattedUUID
                    }

                    delete existing[oldName]
                    uuidToName[formattedUUID] = newName
                }

            } else {

                console.log(`➕ Adding new: ${newName}`)

                existing[newName] = {
                    uuid: formattedUUID
                }

                uuidToName[formattedUUID] = newName
            }
        }

        if (i + BATCH_SIZE < namesToFetch.length) {
            console.log(`Waiting ${DELAY_MS}ms...`)
            await sleep(DELAY_MS)
        }
    }

    for (const player of players) {

        const { username, hypixel_rank, guild_rank } = player

        if (!existing[username]) continue

        existing[username].hypixel_rank = hypixel_rank
        existing[username].guild_rank = guild_rank
    }

    save(existing)
    console.log("\n✅ UUID + rank sync complete.")
}

module.exports = { syncUuidAndRanks }