const fs = require("fs")
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { summarizeSessions, getSessionRules } = require("../guild/handlers/ActivityCheckHandler.js")

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
    label: "\u001b[0;37m",
    bold: "\u001b[1;37m",
    highlight: "\u001b[1;32m",
    reset: "\u001b[0m"
}

const COLORS = {
    guild: 0x47F049,
    member: 0xBCB496,
    activity: 0x248046,
    skyblock: 0x5865F2,
    dungeons: 0xDA373C
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
    const short = (value, suffix) => `${value.toFixed(1).replace(/\.0$/, "")}${suffix}`
    if (n >= 1e9) return short(n / 1e9, "B")
    if (n >= 1e6) return short(n / 1e6, "M")
    if (n >= 1e4) return short(n / 1e3, "k")
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

function chunkItems(title, items, separator = " ") {
    const fields = []
    let current = []
    let length = 0

    for (const piece of items) {
        if (current.length && length + piece.length + separator.length > 1024) {
            fields.push(current)
            current = []
            length = 0
        }
        current.push(piece)
        length += piece.length + separator.length
    }
    if (current.length) fields.push(current)

    return fields.map((group, i) => ({
        name: i === 0 ? title : "\u200b",
        value: group.join(separator),
        inline: false
    }))
}

function chunkFields(title, names) {
    return chunkItems(`-- ${title} --`, names.map(name => `${escapeName(name)} ●`))
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

function activityBlock(sessions, rules) {
    const now = Math.floor(Date.now() / 1000)
    const periods = [["7 days", 7], ["1 month", 30], ["2 months", 60], ["3 months", 90], ["6 months", 180]]

    const lines = [`${C.bold}${"Period".padEnd(11)}${"Playtime".padStart(9)}${"Sessions".padStart(10)}${C.reset}`]

    for (const [label, days] of periods) {
        const { playtime: time, count } = summarizeSessions(sessions, rules, now - days * DAY, now)
        const perDay = time / days / 3600
        const color = perDay >= 2 ? C.green : perDay >= 0.5 ? C.yellow : C.red
        lines.push(`${C.label}${label.padEnd(11)}${color}${formatDuration(time).padStart(9)}${C.blue}${String(count).padStart(10)}${C.reset}`)
    }

    const halfYear = summarizeSessions(sessions, rules, now - 180 * DAY, now)
    const average = halfYear.count ? formatDuration(halfYear.playtime / halfYear.count) : "N/A"

    lines.push(divider(30))
    lines.push(`${C.label}${"Avg session".padEnd(11)}${C.bold}${average.padStart(9)}${C.reset}`)

    return ansi(lines)
}

function guildExpBlock(guild) {
    const days = [...guild.days].sort((a, b) => b[0].localeCompare(a[0]))
    const max = Math.max(...days.map(([, xp]) => xp), 1)

    const lines = [`${C.bold}${"Day".padEnd(10)}${"GEXP".padStart(9)}${C.reset}`]

    days.forEach(([date, xp], i) => {
        const [, month, day] = date.split("-")
        const label = i === 0 ? "Today" : `${MONTHS[Number(month) - 1].slice(0, 3)} ${Number(day)}`
        const color = xp === 0 ? C.red : xp >= max * 0.6 ? C.green : C.yellow
        lines.push(`${C.label}${label.padEnd(10)}${color}${xp.toLocaleString("en-US").padStart(9)}  ${C.blue}${bar(xp / max)}${C.reset}`)
    })

    const average = days.length ? Math.round(guild.weekly / days.length) : 0

    lines.push(divider(31))
    lines.push(`${C.label}${"Weekly".padEnd(10)}${C.bold}${guild.weekly.toLocaleString("en-US").padStart(9)}${C.reset}`)
    lines.push(`${C.label}${"Daily avg".padEnd(10)}${C.bold}${average.toLocaleString("en-US").padStart(9)}${C.reset}`)

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
        `${C.label}${label.padEnd(14)}${color}${value.padStart(9)}${C.reset}`
    ))
}

function skillsBlock(skills) {
    const lines = [`${C.bold}${"Skill".padEnd(11)}${"Level".padStart(6)}  Progress${C.reset}`]

    for (const [name, { level, cap }] of Object.entries(skills)) {
        const maxed = level >= cap
        const progress = maxed ? 1 : level % 1
        lines.push(`${maxed ? C.yellow : C.label}${capitalize(name).padEnd(11)}${C.bold}${(maxed ? `${cap}` : level.toFixed(2)).padStart(6)}  ${maxed ? C.yellow : C.blue}${bar(progress)}${C.reset}`)
    }

    return ansi(lines)
}

function slayersBlock(slayers) {
    const lines = [`${C.bold}${"Slayer".padEnd(12)}${"Lvl".padStart(3)}${"XP".padStart(8)}  Tier${C.reset}`]

    for (const [boss, { level, xp }] of Object.entries(slayers)) {
        const maxLevel = boss === "vampire" ? 5 : 9
        const color = level >= maxLevel ? C.yellow : C.label
        lines.push(`${color}${SLAYER_NAMES[boss].padEnd(12)}${C.bold}${String(level).padStart(3)}${C.blue}${compact(xp).padStart(8)}  ${C.red}${bar(level / maxLevel, maxLevel)}${C.reset}`)
    }

    const total = Object.values(slayers).reduce((sum, s) => sum + s.xp, 0)
    lines.push(divider(32))
    lines.push(`${C.label}${"Total XP".padEnd(12)}${C.bold}${compact(total).padStart(11)}${C.reset}`)

    return ansi(lines)
}

function dungeonsBlock(d) {
    const exactLevel = p => p.level >= 50 ? p.level : p.level + Number(p.percent) / 100

    const row = (label, p, highlight) =>
        `${highlight ? C.highlight : C.label}${label.padEnd(11)}${C.bold}${exactLevel(p).toFixed(2).padStart(6)}${C.yellow}${(p.xpLeftTo50 === 0 ? "MAX" : compact(p.xpLeftTo50)).padStart(8)}  ${C.blue}${bar(Number(p.percent) / 100)}${C.reset}`

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
    lines.push(`${C.label}${"Class Avg".padEnd(11)}${C.bold}${average.toFixed(2).padStart(6)}${C.reset}`)

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
        `${C.label}${label.padEnd(15)}${color}${value.padStart(9)}${C.reset}`
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

    if (Array.isArray(member?.["Old names"]) && member["Old names"].length) {
        embed.addFields({ name: "📛 Previous Names", value: member["Old names"].join(", ").slice(0, 1024), inline: false })
    }

    return embed
}

function activityEmbed({ member, stats, rules }) {
    const sessions = Array.isArray(member?.last_sessions) ? member.last_sessions : []
    const guild = stats?.guild

    if (!guild?.days?.length && !sessions.length) return null

    const embed = new EmbedBuilder()
        .setColor(COLORS.activity)
        .setTitle("📊 Activity")

    if (guild?.days?.length) {
        embed.addFields({ name: "📈 Guild Exp", value: guildExpBlock(guild), inline: false })
    }

    if (sessions.length) {
        embed.addFields({ name: "🕹️ Playtime", value: activityBlock(sessions, rules), inline: false })
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

const PAGES = [
    { id: "member", emoji: "👤", style: ButtonStyle.Secondary },
    { id: "activity", emoji: "📊", style: ButtonStyle.Success },
    { id: "skyblock", emoji: "🏝️", style: ButtonStyle.Primary },
    { id: "dungeons", emoji: "⚔️", style: ButtonStyle.Danger }
]

function pageButtons(name, current, available) {
    return new ActionRowBuilder().addComponents(
        PAGES.map(page =>
            new ButtonBuilder()
                .setCustomId(`meminfo:${page.id}:${name}`)
                .setEmoji(page.emoji)
                .setStyle(page.id === current ? page.style : ButtonStyle.Secondary)
                .setDisabled(!available.includes(page.id) || (page.id === current && page.style === ButtonStyle.Secondary))
        )
    )
}

function linkButtons(username) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("NameMC").setEmoji({ name: "qnamemc", id: "933348124175511653" }).setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${username}`),
        new ButtonBuilder().setLabel("SkyCrypt").setEmoji({ name: "qskycrypt", id: "933347115030175865" }).setStyle(ButtonStyle.Link).setURL(`https://sky.shiiyu.moe/stats/${username}`)
    )
}

function buildMemberInfoMessage({ name, uuid, member, stats, thumbnail, rules = getSessionRules(), page = "member" }) {
    const pages = { member: memberEmbed({ name, member, stats, thumbnail }) }

    const activity = activityEmbed({ member, stats, rules })
    if (activity) pages.activity = activity

    if (stats?.skyblock) {
        pages.skyblock = skyblockEmbed(stats)
        pages.dungeons = dungeonsEmbed(stats)
    } else {
        const reason = stats?.errors?.some(e => e.startsWith("SkyBlock")) ? "Not available right now" : "No SkyBlock profile found"
        pages.member.addFields({ name: "🏝️ SkyBlock", value: reason, inline: false })
    }

    const current = pages[page] ? page : "member"
    const embed = pages[current]

    if (current !== "member") {
        const hypixelRank = member?.hypixel_rank && member.hypixel_rank !== "Non" ? `[${member.hypixel_rank}] ` : ""
        embed.setAuthor({ name: `${hypixelRank}${name}`, iconURL: `https://mc-heads.net/avatar/${uuid}` })
    }

    embed.setTimestamp(Date.now())
    if (stats?.errors?.length) embed.setFooter({ text: stats.errors.join(" | ").slice(0, 2048) })

    return {
        embeds: [embed],
        components: [pageButtons(name, current, Object.keys(pages)), linkButtons(name)]
    }
}

function buildGuildListMessage(guild, { thumbnail, lobbyHolder }) {
    const isBot = name => lobbyHolder && name.toLowerCase() === lobbyHolder.toLowerCase()
    const members = guild.members.filter(m => !isBot(m.name))
    const ranks = [...guild.ranks, ...new Set(members.map(m => m.rank).filter(r => !guild.ranks.includes(r)))]

    const embed = new EmbedBuilder()
        .setColor(COLORS.guild)
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
        .setColor(COLORS.guild)
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

function formatHours(seconds) {
    const hours = Math.floor(seconds / 3600)
    return hours > 0 ? `${hours}h` : `${Math.floor(seconds / 60)}m`
}

function activityStats(entry) {
    return `${entry.count} · ${formatHours(entry.playtime)} · ${compact(entry.gexp)}`
}

function packMessages(first, fields, color) {
    const messages = [first]
    let current = first
    let size = (first.data.title?.length ?? 0) + (first.data.description?.length ?? 0) + 200

    for (const field of fields) {
        const fieldSize = field.name.length + field.value.length
        if ((current.data.fields?.length ?? 0) >= 25 || size + fieldSize > 5500) {
            current = new EmbedBuilder().setColor(color)
            messages.push(current)
            size = 200
        }
        current.addFields(field)
        size += fieldSize
    }

    return messages
}

function requirementText(labels) {
    const parts = []
    if (labels.sessions !== null) parts.push(`**${labels.sessions}+** sessions`)
    if (labels.gexp !== null) parts.push(`**${compact(labels.gexp)}+** GEXP`)
    if (labels.playtime !== null) parts.push(`**${labels.playtime}+** playtime`)
    return parts.join(labels.match === "all" ? " **and** " : " **or** ")
}

function buildActivityListMessages({ active, inactive, exempt, labels, capped, trackingSince, gexpSince, since }) {
    const format = entry => `${escapeName(entry.name)} (${activityStats(entry)})${entry.isNew ? " 🆕" : ""} ●`
    const formatExempt = entry =>
        `**${escapeName(entry.name)}** (${activityStats(entry)}) · ends <t:${entry.exemption.until}:R>${entry.exemption.reason ? ` · ${entry.exemption.reason}` : ""}`

    const description = [
        `Sessions in the last **${labels.time}** that lasted at least **${labels.minSessionTime}**`,
        `Each join counts once, credited up to **${labels.maxSessionTime}** of playtime`,
        `Long continuous sessions count again every **${labels.sessionCooldown}**`,
        `Rejoining within **${labels.mergeGap}** counts as the same session`,
        `Active = ${requirementText(labels)}`,
        "",
        `✅ **${active.length}** active · ❌ **${inactive.length}** inactive · 🛡️ **${exempt.length}** exempt`,
        "Shown as **(sessions · playtime · GEXP)**"
    ]

    if (trackingSince === null) {
        description.push("", "⚠️ No sessions have been tracked yet, so everyone shows as inactive.")
    } else if (trackingSince > since) {
        description.push("", `⚠️ Sessions have only been tracked since <t:${trackingSince}:D>, which is shorter than the **${labels.time}** being checked. Members may look less active than they are.`)
    }

    if (labels.gexp !== null) {
        if (gexpSince === null) {
            description.push("", "⚠️ No GEXP history has been saved yet, so the GEXP requirement can't be met.")
        } else if (gexpSince > since) {
            description.push("", `⚠️ GEXP has only been saved since <t:${gexpSince}:D>, which is shorter than the **${labels.time}** being checked.`)
        }
    }

    const first = new EmbedBuilder()
        .setColor(COLORS.guild)
        .setTitle("📋 Activity Check")
        .setDescription(description.join("\n"))

    const fields = [
        ...(active.length ? chunkItems(`✅ Active (${active.length})`, active.map(format)) : [{ name: "✅ Active (0)", value: "Nobody", inline: false }]),
        ...(inactive.length ? chunkItems(`❌ Inactive (${inactive.length})`, inactive.map(format)) : [{ name: "❌ Inactive (0)", value: "Nobody", inline: false }]),
        ...(exempt.length ? chunkItems(`🛡️ Exempt (${exempt.length})`, exempt.map(formatExempt), "\n") : [])
    ]

    const embeds = packMessages(first, fields, COLORS.guild)
    const last = embeds[embeds.length - 1]
    last.setTimestamp(Date.now())

    const notes = []
    if ([...active, ...inactive, ...exempt].some(e => e.isNew)) notes.push("🆕 joined the guild during this period")
    if (capped) notes.push("Only 180 days of sessions are stored, so the time was capped at 6M")
    if (notes.length) last.setFooter({ text: notes.join(" · ") })

    return embeds.map(embed => ({ embeds: [embed] }))
}

function buildActivityDefaultsMessage(labels, { title, note } = {}) {
    const rows = [
        ["time", labels.time, "How far back to look"],
        ["sessions", labels.sessions === null ? "off" : `${labels.sessions}`, "Sessions needed to be active"],
        ["gexp", labels.gexp === null ? "off" : compact(labels.gexp), "GEXP needed in the period"],
        ["playtime", labels.playtime ?? "off", "Credited playtime needed in the period"],
        ["match", labels.match, "`any` = meet one requirement, `all` = meet every one"],
        ["session_min_time", labels.minSessionTime, "Shortest session that counts"],
        ["session_max_time", labels.maxSessionTime, "Most playtime one session can add"],
        ["session_cooldown", labels.sessionCooldown, "Long sessions count again after this"],
        ["merge_gap", labels.mergeGap, "Rejoins within this are one session (also used when saving joins/leaves)"]
    ]

    const embed = new EmbedBuilder()
        .setColor(COLORS.guild)
        .setTitle(title ?? "⚙️ Activity Check Defaults")
        .setDescription(rows.map(([key, value, help]) => `\`${key}\` = **${value}** · ${help}`).join("\n"))
        .setTimestamp(Date.now())

    if (note) embed.setFooter({ text: note })

    return { embeds: [embed] }
}

function buildExemptionListMessage(exemptions) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.guild)
        .setTitle(`🛡️ Activity Exemptions (${exemptions.length})`)
        .setTimestamp(Date.now())

    if (exemptions.length === 0) {
        embed.setDescription("Nobody is exempt right now.")
        return { embeds: [embed] }
    }

    const lines = exemptions.map(e =>
        `**${escapeName(e.name)}** · ends <t:${e.until}:R> (<t:${e.until}:d>)${e.reason ? ` · ${e.reason}` : ""}${e.by ? ` · by ${e.by}` : ""}`
    )
    embed.addFields(...chunkItems("Exempt members", lines, "\n"))

    return { embeds: [embed] }
}

module.exports = { buildMemberInfoMessage, buildGuildListMessage, buildGuildOnlineMessage, buildActivityListMessages, buildActivityDefaultsMessage, buildExemptionListMessage, loadMemberData }
