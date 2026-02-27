const cron = require('node-cron')
const EmbedHandler = require('../EmbedHandler')
const DailiesListings = require('./DailiesListings.json')

let dailyTaskUTC = null
let dailyTaskET = null

async function start(client) {

  await update(client, "UTC")
  await update(client, "America/New_York")

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

    if (zoneLabel === "UTC") {

      const nextUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      )

      data.resets.UTC = Math.floor(nextUtcMidnight / 1000)

    } else if (zoneLabel === "ET") {

      const etNow = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      )

      etNow.setDate(etNow.getDate() + 1)
      etNow.setHours(0, 0, 0, 0)

      const etUnix = Math.floor(
        new Date(
          etNow.toLocaleString("en-US", { timeZone: "UTC" })
        ).getTime() / 1000
      )

      data.resets.ET = etUnix
    }

    EmbedHandler.addit("dailiesEmbed", data)

    let utcListings = []
    let etListings = []

    if (Array.isArray(DailiesListings.utc)) {
    utcListings = DailiesListings.utc
    }

    if (Array.isArray(DailiesListings.et)) {
    etListings = DailiesListings.et
    }

    const utcDescription = utcListings.length > 0
    ? "\n\n" + utcListings.map(line => `• ${line}`).join('\n')
    : ""

    const etDescription = etListings.length > 0
    ? "\n\n" + etListings.map(line => `• ${line}`).join('\n')
    : ""

    await await message.edit({
        embeds: [
            {
            color: 0xf5f45e,
            title: "🕒 Dailies Reset Tracker",
            fields: [
                {
                name: "Next UTC Reset (00:00 UTC)",
                value: data.resets.UTC
                    ? `<t:${data.resets.UTC}:R>\n<t:${data.resets.UTC}:t>${utcDescription}`
                    : "Not calculated yet",
                inline: false,
                },
                {
                name: "Next ET Reset (00:00 ET)",
                value: data.resets.ET
                    ? `<t:${data.resets.ET}:R>\n<t:${data.resets.ET}:t>${etDescription}`
                    : "Not calculated yet",
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

module.exports = { start, stop }