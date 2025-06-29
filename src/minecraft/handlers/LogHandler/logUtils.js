const fetch = require("cross-fetch")

function chunkArray(arr, size) {
    const result = []
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size))
    }
    return result
}

function wait(ms) {
     return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchProfiles(usernames) {
    const url = "https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname"

    const res = await fetch(url, {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify(usernames)
    })

    if (res.status === 429) {
        throw new Error("API Hit Rate Limit")
    }

    if (!res.ok) {
        throw new Error(`API Status error: ${res.status}`)
    }

    const data = await res.json()

    if (!Array.isArray(data)) {
        console.error("API Type Error: response needs to be an array", data)
        return []
    }

    return data
}

async function processInBatches(allUsernames) {
    let totalProfiles = []
    const chunks = chunkArray(allUsernames, 10)
    
    for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i]

        let profiles
        let attempt = 0
        const maxRetries = 3

        while (attempt < maxRetries) {
            try {
                profiles = await fetchProfiles(batch)
                console.log("Fetched profiles:", profiles)
                break

            } catch (err) {
                attempt++
                console.error(`Error fetching batch (Attempt ${attempt}):`, err.message)

                if (attempt >= maxRetries) {
                    console.error("Max retries reached. Skipping.")
                    profiles = null
                    break
                }

                const delay = attempt * 15_000
                console.log(`Waiting ${delay / 1000}s before retrying...`)
                await wait(delay)
            }
        }

        if (!profiles) {
            console.log("Skipping this batch due to repeated errors.")
            continue
        }

        totalProfiles.push(...profiles)

        if (i < chunks.length - 1) {
            console.log("Waiting 15 seconds before next batch...")
            await wait(15_000)
        }
  }

  await wait(15_000)
  console.log("Finishing pulling UUIDs from Mojang's API")
  return totalProfiles
}

module.exports = {
  chunkArray,
  wait,
  fetchProfiles,
  processInBatches
}