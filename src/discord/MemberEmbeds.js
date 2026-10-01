const fs = require("fs")
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const AOTE_FILE = "./AspectOfTheEgg.json"
const DAY = 24 * 60 * 60

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const SLAYER_NAMES = { zombie: "Revenant", spider: "Tarantula", wolf: "Sven", enderman: "Voidgloom", blaze: "Inferno", vampire: "Riftstalker" }

const C = {
    gray: "\u001b[0;30m",
    red: "\u001b[0;31m",
    green: "\u001b[0;32m",
    yellow: "\u001b[0;33m",
    blue: "\u001b[0;34m",
    pink: "\u001b[0;35m",
    cyan: "\u001b[0;36m",
    bold: "\u001b[1;37m",
    reset: "\u001b[0m"
}

const COLORS = {
    member: 0x47F049,
    skyblock: 0xF5A623,
    dungeons: 0xC0392B
}

function ansi(lines) {
    return "```ansi\n" + lines.join("\n") + "\n```"
}

function divider(width) {
    return `${C.gray}${"─".repeat(width)}${C.reset}`
}

function bar(fraction, width = 10) {
    const filled = Math.max(0, Math.min(width, Math.floor(fraction * width)))
    return "■".repeat(filled) + "□".repeat(width - filled)
}

function compact(n) {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`
    return Math.floor(n).toLocaleString("en-US")
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function capitalize(text) {
    return text[0].toUpperCase() + text.slice(1)
}

function loadMemberData(username) {
    if (!fs.existsSync(AOTE_FILE)) return null
    const data = JSON.parse(fs.readFileSync(AOTE_FILE, "utf8"))
    const lower = username.toLowerCase()
    const key = Object.keys(data).find(k => k.toLowerCase() === lower)
    return key ? data[key] : null
}

function escapeName(name) {
    return name.replace(/_/g, "\\_")
}

function chunkFields(title, names) {
    const fields = []
    let current = []
    let length = 0

    for (const name of names) {
        const piece = `${escapeName(name)} ●`
        if (current.length && length + piece.length + 1 > 1024) {
            fields.push(current)
            current = []
            length = 0
        }
        current.push(piece)
        length += piece.length + 1
    }
    if (current.length) fields.push(current)

    return fields.map((group, i) => ({
        name: i === 0 ? `-- ${title} --` : "\u200b",
        value: group.join(" "),
        inline: false
    }))
}

function statsSince(sessions, since, now) {
    let time = 0
    let count = 0
    for (const s of sessions) {
        if (s.leave === -1) {
            if (s.join >= since) count++
            continue
        }
        const end = s.leave === 0 ? now : s.leave
        const start = Math.max(s.join, since)
        if (end > start) {
            time += end - start
            count++
        }
    }
    return { time, count }
}

function statusFields(sessions) {
    if (sessions.length === 0) {
        return [{ name: "Status", value: "No tracked sessions yet", inline: false }]
    }

    const last = sessions[sessions.length - 1]

    let status
    if (last.leave === 0) {
        status = `🟢 Online since <t:${last.join}:R>`
    } else if (last.leave > 0) {
        status = `⚫ Last seen <t:${last.leave}:R>`
    } else {
        status = `⚫ Last seen <t:${last.join}:R> (leave time unknown)`
    }

    return [
        { name: "Status", value: status, inline: false },
        { name: "🕒 Last Join", value: `<t:${last.join}:f> (<t:${last.join}:R>)`, inline: false }
    ]
}

function activityBlock(sessions) {
    const now = Math.floor(Date.now() / 1000)
    const periods = [["7 days", 7], ["1 month", 30], ["2 months", 60], ["3 months", 90], ["6 months", 180]]

    const lines = [`${C.bold}${"Period".padEnd(11)}${"Playtime".padStart(9)}${"Sessions".padStart(10)}${C.reset}`]

    for (const [label, days] of periods) {
        const { time, count } = statsSince(sessions, now - days * DAY, now)
        const perDay = time / days / 3600
        const color = perDay >= 2 ? C.green : perDay >= 0.5 ? C.yellow : C.gray
        lines.push(`${C.cyan}${label.padEnd(11)}${color}${formatDuration(time).padStart(9)}${C.blue}${String(count).padStart(10)}${C.reset}`)
    }

    const finished = sessions.filter(s => s.join >= now - 180 * DAY && s.leave > 0)
    const average = finished.length
        ? formatDuration(finished.reduce((sum, s) => sum + (s.leave - s.join), 0) / finished.length)
        : "N/A"

    lines.push(divider(30))
    lines.push(`${C.cyan}${"Avg session".padEnd(11)}${C.bold}${average.padStart(9)}${C.reset}`)

    return ansi(lines)
}

function guildExpBlock(guild) {
    const days = [...guild.days].sort((a, b) => b[0].localeCompare(a[0]))
    const max = Math.max(...days.map(([, xp]) => xp), 1)

    const lines = [`${C.bold}${"Day".padEnd(10)}${"GEXP".padStart(9)}${C.reset}`]

    days.forEach(([date, xp], i) => {
        const [, month, day] = date.split("-")
        const label = i === 0 ? "Today" : `${MONTHS[Number(month) - 1].slice(0, 3)} ${Number(day)}`
        const color = xp === 0 ? C.gray : xp >= max * 0.6 ? C.green : C.yellow
        lines.push(`${C.cyan}${label.padEnd(10)}${color}${xp.toLocaleString("en-US").padStart(9)}  ${C.blue}${bar(xp / max)}${C.reset}`)
    })

    const average = days.length ? Math.round(guild.weekly / days.length) : 0

    lines.push(divider(31))
    lines.push(`${C.cyan}${"Weekly".padEnd(10)}${C.bold}${guild.weekly.toLocaleString("en-US").padStart(9)}${C.reset}`)
    lines.push(`${C.cyan}${"Daily avg".padEnd(10)}${C.bold}${average.toLocaleString("en-US").padStart(9)}${C.reset}`)

    return ansi(lines)
}

function overviewBlock(sb) {
    const rows = [
        ["SkyBlock Lvl", sb.level.toFixed(2), C.green],
        ["Skill Avg", sb.skillAverage.toFixed(2), C.green],
        ["Magical Power", compact(sb.magicalPower), C.pink],
        ["Purse", compact(sb.purse), C.yellow],
        ["Bank", sb.bank === null ? "API off" : compact(sb.bank), C.yellow],
        ["Fairy Souls", compact(sb.fairySouls), C.blue],
        ["Pets", compact(sb.pets), C.blue],
        ["Deaths", compact(sb.deaths), C.red]
    ]

    return ansi(rows.map(([label, value, color]) =>
        `${C.cyan}${label.padEnd(14)}${color}${value.padStart(9)}${C.reset}`
    ))
}

function skillsBlock(skills) {
    const lines = [`${C.bold}${"Skill".padEnd(11)}${"Level".padStart(6)}  Progress${C.reset}`]

    for (const [name, { level, cap }] of Object.entries(skills)) {
        const maxed = level >= cap
        const progress = maxed ? 1 : level % 1
        lines.push(`${maxed ? C.yellow : C.cyan}${capitalize(name).padEnd(11)}${C.bold}${(maxed ? `${cap}` : level.toFixed(2)).padStart(6)}  ${maxed ? C.yellow : C.blue}${bar(progress)}${C.reset}`)
    }

    return ansi(lines)
}

function slayersBlock(slayers) {
    const lines = [`${C.bold}${"Slayer".padEnd(12)}${"Lvl".padStart(3)}${"XP".padStart(8)}  Tier${C.reset}`]

    for (const [boss, { level, xp }] of Object.entries(slayers)) {
        const maxLevel = boss === "vampire" ? 5 : 9
        const color = level === 0 ? C.gray : level >= maxLevel ? C.yellow : C.cyan
        lines.push(`${color}${SLAYER_NAMES[boss].padEnd(12)}${C.bold}${String(level).padStart(3)}${C.gray}${compact(xp).padStart(8)}  ${C.red}${bar(level / maxLevel, maxLevel)}${C.reset}`)
    }

    const total = Object.values(slayers).reduce((sum, s) => sum + s.xp, 0)
    lines.push(divider(32))
    lines.push(`${C.cyan}${"Total XP".padEnd(12)}${C.bold}${compact(total).padStart(11)}${C.reset}`)

    return ansi(lines)
}

function dungeonsBlock(d) {
    const exactLevel = p => p.level >= 50 ? p.level : p.level + Number(p.percent) / 100

    const row = (label, p, highlight) =>
        `${highlight ? C.green : C.cyan}${label.padEnd(11)}${C.bold}${exactLevel(p).toFixed(2).padStart(6)}${C.gray}${(p.xpLeftTo50 === 0 ? "MAX" : compact(p.xpLeftTo50)).padStart(8)}  ${C.blue}${bar(Number(p.percent) / 100)}${C.reset}`

    const lines = [`${C.bold}${"".padEnd(11)}${"Level".padStart(6)}${"To 50".padStart(8)}  Progress${C.reset}`]
    lines.push(row("Catacombs", d.catacombs, false))
    lines.push(divider(35))

    for (const [name, p] of Object.entries(d.classes)) {
        const selected = name === d.selectedClass
        lines.push(row(`${selected ? "★" : " "}${capitalize(name)}`, p, selected))
    }

    const levels = Object.values(d.classes).map(exactLevel)
    const average = levels.reduce((a, b) => a + b, 0) / levels.length

    lines.push(divider(35))
    lines.push(`${C.cyan}${"Class Avg".padEnd(11)}${C.bold}${average.toFixed(2).padStart(6)}${C.reset}`)

    return ansi(lines)
}

function dungeonRunsBlock(d) {
    const floor = d.highestFloor === null ? "None" : d.highestFloor === 0 ? "Entrance" : `F${d.highestFloor}`
    const master = d.highestMaster === null ? "None" : `M${d.highestMaster}`

    const rows = [
        ["Highest Floor", floor, C.green],
        ["Highest Master", master, C.red],
        ["Floor Runs", compact(d.runs), C.blue],
        ["Master Runs", compact(d.masterRuns), C.blue],
        ["Secrets", compact(d.secrets), C.pink]
    ]

    return ansi(rows.map(([label, value, color]) =>
        `${C.cyan}${label.padEnd(15)}${color}${value.padStart(9)}${C.reset}`
    ))
}

function memberEmbed({ name, member, stats, thumbnail }) {
    const sessions = Array.isArray(member?.last_sessions) ? member.last_sessions : []
    const hypixelRank = member?.hypixel_rank && member.hypixel_rank !== "Non" ? `[${member.hypixel_rank}] ` : ""

    const guild = stats?.guild
    const guildFailed = stats?.errors?.some(e => e.startsWith("Guild"))
    const rank = guild?.rank ?? (guildFailed ? member?.guild_rank ?? "Unknown" : "Not in guild")
    const joined = guild?.joined ? `<t:${guild.joined}:D>` : "Unknown"

    const embed = new EmbedBuilder()
        .setColor(COLORS.member)
        .setTitle(`${hypixelRank}${name}`)
        .setThumbnail(thumbnail)
        .addFields(
            { name: "🏷️ Rank", value: rank, inline: true },
            { name: "📅 Joined", value: joined, inline: true }
        )
        .addFields(...statusFields(sessions))

    if (guild?.days?.length) {
        embed.addFields({ name: "📈 Guild Exp", value: guildExpBlock(guild), inline: false })
    }

    if (sessions.length) {
        embed.addFields({ name: "📊 Activity", value: activityBlock(sessions), inline: false })
    }

    if (Array.isArray(member?.["Old names"]) && member["Old names"].length) {
        embed.addFields({ name: "📛 Previous Names", value: member["Old names"].join(", ").slice(0, 1024), inline: false })
    }

    return embed
}

function skyblockEmbed(stats) {
    return new EmbedBuilder()
        .setColor(COLORS.skyblock)
        .setTitle(`🏝️ SkyBlock (${stats.profile})`)
        .addFields(
            { name: "📋 Overview", value: overviewBlock(stats.skyblock), inline: false },
            { name: "📚 Skills", value: skillsBlock(stats.skyblock.skills), inline: false },
            { name: "🗡️ Slayers", value: slayersBlock(stats.skyblock.slayers), inline: false }
        )
}

function dungeonsEmbed(stats) {
    return new EmbedBuilder()
        .setColor(COLORS.dungeons)
        .setTitle("⚔️ Dungeons")
        .addFields(
            { name: "🎓 Levels", value: dungeonsBlock(stats.dungeons), inline: false },
            { name: "🏆 Runs", value: dungeonRunsBlock(stats.dungeons), inline: false }
        )
}

function linkButtons(username) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(`Namemc`).setEmoji({ name: "qnamemc", id: "933348124175511653" }).setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${username}`),
        new ButtonBuilder().setLabel(`Skycrypt`).setEmoji({ name: "qskycrypt", id: "933347115030175865" }).setStyle(ButtonStyle.Link).setURL(`https://sky.shiiyu.moe/stats/${username}`)
    )
}

function buildMemberInfoMessage({ name, member, stats, thumbnail }) {
    const embeds = [memberEmbed({ name, member, stats, thumbnail })]

    if (stats?.skyblock) {
        embeds.push(skyblockEmbed(stats))
        embeds.push(dungeonsEmbed(stats))
    } else {
        const reason = stats?.errors?.some(e => e.startsWith("SkyBlock")) ? "Not available right now" : "No SkyBlock profile found"
        embeds[0].addFields({ name: "🏝️ SkyBlock", value: reason, inline: false })
    }

    const last = embeds[embeds.length - 1]
    last.setTimestamp(Date.now())
    if (stats?.errors?.length) last.setFooter({ text: stats.errors.join(" | ").slice(0, 2048) })

    return { embeds, components: [linkButtons(name)] }
}

function buildGuildListMessage(guild, { thumbnail, lobbyHolder }) {
    const isBot = name => lobbyHolder && name.toLowerCase() === lobbyHolder.toLowerCase()
    const members = guild.members.filter(m => !isBot(m.name))
    const ranks = [...guild.ranks, ...new Set(members.map(m => m.rank).filter(r => !guild.ranks.includes(r)))]

    const embed = new EmbedBuilder()
        .setColor(COLORS.member)
        .setTitle(guild.name)
        .setThumbnail(thumbnail)
        .setTimestamp(Date.now())
        .setFooter({ text: `Total Members: ${guild.totalMembers - (guild.members.length - members.length)}` })

    for (const rank of ranks) {
        const names = members
            .filter(m => m.rank === rank)
            .map(m => m.name)

        if (names.length) embed.addFields(...chunkFields(rank, names))
    }

    return { embeds: [embed] }
}

function buildGuildOnlineMessage({ guildName, groups }, { thumbnail, lobbyHolder }) {
    const isBot = name => lobbyHolder && name.toLowerCase() === lobbyHolder.toLowerCase()
    const visible = groups
        .map(g => ({ rank: g.rank, names: g.names.filter(n => !isBot(n)) }))
        .filter(g => g.names.length)

    const embed = new EmbedBuilder()
        .setColor(COLORS.member)
        .setTitle(guildName)
        .setThumbnail(thumbnail)
        .setTimestamp(Date.now())
        .setFooter({ text: `Online Members: ${visible.reduce((sum, g) => sum + g.names.length, 0)}` })

    if (visible.length === 0) {
        embed.addFields({ name: "No one is online at the moment", value: "⁽ᴵ ᶠᵉᵉˡ ˡᵒⁿᵉˡʸ⁾", inline: false })
    }

    for (const group of visible) {
        embed.addFields(...chunkFields(group.rank, group.names))
    }

    return { embeds: [embed] }
}

module.exports = { buildMemberInfoMessage, buildGuildListMessage, buildGuildOnlineMessage, loadMemberData }
