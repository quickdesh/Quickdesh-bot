const EmbedHandler = require('../EmbedHandler')

class InteractionHandler {

	constructor(discord) {
	    this.discord = discord
	}

    async buttonInteraction(butt) {
        if (!butt.isButton()) return
        
        if (butt.isButton()){
            await butt.deferUpdate()
        }
        if(butt.customId.split(" ")[0] == "acceptjoinee"){
            butt.message.edit({ embeds: butt.message.embeds,components: [butt.message.components[1]]})
            const player = butt.customId.split(" ")[1]
            this.app.minecraft.bot.chat(`/g accept ${player}`)
            this.app.minecraft.bot.chat(`/g invite ${player}`)
            butt.message.reply({content: `${butt.user} accepted ${player}`})
        }
        else if(butt.customId.split(" ")[0] == "rejectjoinee"){
            butt.message.edit({ embeds: butt.message.embeds,components: [butt.message.components[1]]})
            const player = butt.customId.split(" ")[1]
            butt.message.reply({content: `${butt.user} rejected ${player}`})
        }
    }

    async slashInteraction(slash) {
        if (!slash.isChatInputCommand()) return

        if (slash.commandName === "startdailies") {
            if (EmbedHandler.includes("dailiesEmbed")) {
                return slash.reply({
                    content: "Dailies embed already exists.",
                    ephemeral: true
                })
            }

            const message = await slash.reply({
                content: "Initializing Dailies embed...",
                fetchReply: true
            })

            EmbedHandler.addit("dailiesEmbed", {
                channelId: message.channel.id,
                messageId: message.id
            })

            await startDailiesMessage(this.discord.client)

            await slash.followUp({
                content: "✅ This message will update daily at 0 UTC and 0 ET.",
                ephemeral: true
            })

        } else if (slash.commandName === "stopdailies") {
            if (!EmbedHandler.includes("dailiesEmbed")) {
                return slash.reply({
                    content: "No active Dailies embed found.",
                    ephemeral: true
                })
            }

            await stopDailiesMessage(this.discord.client)

            await slash.reply({
                content: "🛑 Dailies embed updater stopped successfully.",
                ephemeral: true
            })
        }
    }
}


let dailyTaskUTC = null
let dailyTaskET = null

async function startDailiesMessage(client) {

    if (!dailyTaskUTC) {
        dailyTaskUTC = cron.schedule(
            "0 0 * * *",
            async () => {
                await updateDailyEmbed(client, "UTC")
            },
            { timezone: "UTC" }
        )
    }

    if (!dailyTaskET) {
        dailyTaskET = cron.schedule(
            "0 0 * * *",
            async () => {
                await updateDailyEmbed(client, "America/New_York")
            },
            { timezone: "America/New_York" }
        )
    }

    console.log("Daily cron jobs scheduled.")
}

async function stopDailiesMessage(client) {

    if (dailyTaskUTC) {
        dailyTaskUTC.stop()
        dailyTaskUTC = null
    }

    if (dailyTaskET) {
        dailyTaskET.stop()
        dailyTaskET = null
    }

    if (EmbedHandler.includes("dailyEmbed")) {

        const data = EmbedHandler.get("dailyEmbed")

        try {
            const channel = await client.channels.fetch(data.channelId)
            const message = await channel.messages.fetch(data.messageId)

            await message.delete().catch(() => {})
        } catch (err) {
            // ignore if already deleted
        }

        EmbedHandler.delete("dailyEmbed")
    }

    console.log("Daily cron stopped.")
}

async function updateDailyEmbed(client, zoneLabel) {

    if (!EmbedHandler.includes("dailyEmbed")) return

    try {
        const data = EmbedHandler.get("dailyEmbed")
        const channel = await client.channels.fetch(data.channelId)

        let message

        try {
            // Try to fetch existing message
            message = await channel.messages.fetch(data.messageId)
        } catch (err) {
            console.log("Message not found. Recreating...")

            // If fetch fails, recreate message
            message = await channel.send("Recreated daily message.")

            // Update storage with new message ID
            EmbedHandler.addit("dailyEmbed", {
                channelId: channel.id,
                messageId: message.id
            })
        }

        const newContent = `Updated at ${new Date().toLocaleString("en-US", {
            timeZone: zoneLabel
        })} (${zoneLabel})`

        await message.edit(newContent)

        console.log(`Daily embed updated for ${zoneLabel}.`)

    } catch (err) {
        console.error(`Cron update failed (${zoneLabel}):`, err)
    }
}

module.exports = InteractionHandler