const cron = require('node-cron')
const EmbedHandler = require('../EmbedHandler')
const fs = require("fs").promises
const path = require("path")

const FILE_PATH = path.join(__dirname, "DailiesListings.json")

let dailyTaskUTC = null
let dailyTaskET = null

async function start(client) {

  await update(client, "ALL")

  if (!dailyTaskUTC) {
    dailyTaskUTC = cron.schedule(
      "0 1 * * *",
      async () => update(client, "UTC"),
      { timezone: "UTC" }
    )
  }

  if (!dailyTaskET) {
    dailyTaskET = cron.schedule(
      "0 1 * * *",
      async () => update(client, "ET"),
      { timezone: "America/New_York" }
    )
  }

  console.log("Dailies cron jobs scheduled.")
}

async function stop(client) {

  if (dailyTaskUTC) {
    dailyTaskUTC.stop()
    dailyTaskUTC = null
  }

  if (dailyTaskET) {
    dailyTaskET.stop()
    dailyTaskET = null
  }

  if (EmbedHandler.includes("dailiesEmbed")) {

    const data = EmbedHandler.get("dailiesEmbed")

    try {
      const channel = await client.channels.fetch(data.channelId)
      const message = await channel.messages.fetch(data.messageId)
      await message.delete().catch(() => {})
    } catch {}

    EmbedHandler.delete("dailiesEmbed")
  }

  console.log("Dailies cron stopped.")
}

async function update(client, zoneLabel) {

  if (!EmbedHandler.includes("dailiesEmbed")) return

  try {
    const data = EmbedHandler.get("dailiesEmbed")
    const channel = await client.channels.fetch(data.channelId)

    let message

    try {
      message = await channel.messages.fetch(data.messageId)
    } catch {
      message = await channel.send("Recreated dailies message.")
      EmbedHandler.addit("dailiesEmbed", {
        channelId: channel.id,
        messageId: message.id
      })
    }

    if (!data.resets) {
      data.resets = {}
    }

    const now = new Date()

    if (zoneLabel === "UTC" || zoneLabel === "ALL") {

      const nextUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      )

      data.resets.UTC = Math.floor(nextUtcMidnight / 1000)

    } 
    
    if (zoneLabel === "ET" || zoneLabel === "ALL") {

        const now = new Date()

        // Get current time in ET
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        })

        const parts = formatter.formatToParts(now)

        const year = parts.find(p => p.type === "year").value
        const month = parts.find(p => p.type === "month").value
        const day = parts.find(p => p.type === "day").value

        const etMidnight = new Date(
            `${year}-${month}-${Number(day) + 1}T00:00:00`
        )

        const etUnix = Math.floor(
            new Date(
            etMidnight.toLocaleString("en-US", { timeZone: "UTC" })
            ).getTime() / 1000
        )

        data.resets.ET = etUnix
    }

    EmbedHandler.addit("dailiesEmbed", data)
    let DailiesListings = await loadJson()

    let utcListings = []
    let etListings = []

    if (Array.isArray(DailiesListings.utc)) {
    utcListings = DailiesListings.utc
    }

    if (Array.isArray(DailiesListings.et)) {
    etListings = DailiesListings.et
    }

    const utcDescription = utcListings.length > 0
    ? "\n\n" + utcListings.map(line => `${line}`).join('\n')
    : ""

    const etDescription = etListings.length > 0
    ? "\n\n" + etListings.map(line => `${line}`).join('\n')
    : ""

    await message.edit({
        content: "",
        embeds: [
            {
            color: 0xf5f45e,
            title: "🕒 Dailies Reset Tracker",
            fields: [
                {
                name: data.resets.UTC
                    ? `<t:${data.resets.UTC}:t> (<t:${data.resets.UTC}:R>)`
                    : "Next UTC Reset (00:00 UTC)",
                value:`${utcDescription}`,
                inline: false,
                },
                {
                name: data.resets.ET
                    ? `<t:${data.resets.ET}:t> (<t:${data.resets.ET}:R>)`
                    : "Next ET Reset (00:00 ET)",
                value:`${etDescription}`,
                inline: false,
                },
            ],
            timestamp: new Date(),
            },
        ],
    })

  } catch (err) {
    console.error(`Dailies update failed (${zoneLabel})`, err)
  }
}

async function loadJson() {
    let DailiesListings = {}

    try {
    const file = await fs.readFile(FILE_PATH, "utf8")
        DailiesListings = JSON.parse(file)
    } catch (err) {
    console.error("Failed to load DailiesListings.json:", err)
        DailiesListings = { "et": ["Fetchur"], "utc": ["Matriarch"] }
    }

    return DailiesListings
}

async function updateJson(client, action, zone, text) {

  let DailiesListings = await loadJson()

  if (!Array.isArray(DailiesListings.utc)) DailiesListings.utc = []
  if (!Array.isArray(DailiesListings.et)) DailiesListings.et = []

  if (action === "add") {

    DailiesListings[zone].push(text.trim())

  } else if (action === "remove") {

    const index = parseInt(text)

    if (!isNaN(index)) {
      DailiesListings[zone].splice(index - 1, 1)

    } else {
      DailiesListings[zone] = DailiesListings[zone].filter(
        item => item.toLowerCase() !== text.toLowerCase()
      )

    }
  }

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(DailiesListings, null, 2)
  )

  await update(client, "ALL")

  return true
}

module.exports = { start, stop, updateJson }