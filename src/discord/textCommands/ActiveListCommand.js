const DiscordCommand = require('../../contracts/DiscordCommand')
const GuildManager = require('../../guild/GuildManager.js')

function currentDefaults() {
	try {
		const d = GuildManager.getActivityDefaults()
		const off = v => v === null ? 'off' : v
		return [
			`time=${d.time} · sessions=${off(d.sessions)} · gexp=${d.gexp === null ? 'off' : d.gexp} · playtime=${off(d.playtime)} · match=${d.match}`,
			`session_min_time=${d.minSessionTime} · session_max_time=${d.maxSessionTime} · session_cooldown=${d.sessionCooldown} · merge_gap=${d.mergeGap}`
		]
	} catch {
		return ['Couldn\'t read the saved defaults']
	}
}


class ActiveListCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'activelist'
		this.aliases = ['al', 'activity']
		this.description = 'Lists active, inactive and exempt guild members by sessions, GEXP and/or playtime'
		this.isAdminCommand = false
	}

	help(prefix) {
		return {
			usage: `${prefix}activelist [option=value ...]`,
			sections: [
				{
					name: 'What it does',
					lines: [
						'Splits current guild members into ✅ Active, ❌ Inactive and 🛡️ Exempt using the requirements below.',
						`Any option you leave out uses the saved default (change them with \`${prefix}activeconfig\`).`
					]
				},
				{ name: 'Current defaults', lines: currentDefaults() },
				{
					name: 'Requirements (who counts as active)',
					lines: [
						'`sessions=20` · sessions needed in the period (`off` to ignore)',
						'`gexp=50k` · GEXP earned in the period. `k` = thousand, `m` = million (`off` to ignore)',
						'`playtime=40h` · credited playtime in the period (`off` to ignore)',
						'`match=any` · active if they pass **any** requirement that\'s on',
						'`match=all` · active only if they pass **every** requirement that\'s on',
						'At least one of `sessions`, `gexp` or `playtime` has to be on.'
					]
				},
				{
					name: 'Session rules (what counts as a session)',
					lines: [
						'`time=2M` · how far back to look (max `6M`, since 180 days are stored)',
						'`session_min_time=30m` · sessions shorter than this don\'t count',
						'`session_max_time=4h` · the most playtime one session can add',
						'`session_cooldown=12h` · one long continuous session counts again every 12h (so 5h = 1, 13h = 2, 20h = 2)',
						'`merge_gap=10m` · leaving and rejoining within this is the same session',
						'Shorthands: `t=` `s=` `gxp=` `pt=` `mode=` `min=` `max=` `cd=` `gap=`'
					]
				},
				{
					name: 'Units',
					lines: [
						'`m` minutes · `h` hours · `d` days · `w` weeks · `M` or `mo` months (30 days) · `y` years',
						'A bare number means days for `time`, minutes for `session_min_time`/`merge_gap`, hours for `session_max_time`/`session_cooldown`/`playtime`'
					]
				},
				{
					name: 'How sessions are counted',
					lines: [
						'• Rejoins within `merge_gap` are merged into one session first',
						'• A session still open (no leave yet) counts as at most 1',
						'• A session with an unknown end time counts as 1 with no playtime',
						'• Only sessions that start inside the period count',
						'• Each session adds at most `session_max_time` of playtime'
					]
				},
				{
					name: 'Reading the result',
					lines: [
						'Each section is a table: **Sess** (blue) = sessions · **Time** (yellow) = credited playtime · **Avg** (pink) = average session length · **GEXP** (green) = guild exp in the period',
						'Every table is grouped by guild rank, highest first (the rank order set in-game, Guild Master on top)',
						'✅ within each rank: most sessions → most playtime → most GEXP → name',
						'❌ within each rank: fewest sessions → least playtime → least GEXP → name',
						'🛡️ within each rank: ending soonest first, plus when each exemption ends and why',
						'`new` = joined the guild during the period, so they had less time',
						'⚠️ = sessions or GEXP haven\'t been tracked for the whole period yet',
						'Big lists carry on in a second message'
					]
				}
			],
			examples: [
				`${prefix}activelist`,
				`${prefix}al time=2M sessions=20`,
				`${prefix}al time=2M sessions=20 gexp=50k match=any`,
				`${prefix}al time=2M sessions=20 playtime=30h match=all`,
				`${prefix}al sessions=off gexp=100k`,
				`${prefix}al time=1w min=1h merge_gap=15m`
			]
		}
	}

	onCommand(message) {
		this.discord.activeList({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = ActiveListCommand
