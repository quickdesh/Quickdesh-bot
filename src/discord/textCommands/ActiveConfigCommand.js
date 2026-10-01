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


class ActiveConfigCommand extends DiscordCommand {
	constructor(discord) {
		super(discord)

		this.name = 'activeconfig'
		this.aliases = ['ac', 'alconfig']
		this.description = 'Shows or changes the default rules used by activelist and member info'
		this.isAdminCommand = true
	}

	help(prefix) {
		return {
			usage: `${prefix}activeconfig [option=value ...] | ${prefix}activeconfig reset`,
			sections: [
				{
					name: 'What it does',
					lines: [
						`Saves the default rules used when \`${prefix}activelist\` is run without options.`,
						'The session rules are also used by the 📊 Activity page in `member`, and `merge_gap` is used when the bot saves joins and leaves.',
						'Only the options you pass are changed; everything else keeps its saved value.'
					]
				},
				{ name: 'Current defaults', lines: currentDefaults() },
				{
					name: 'Modes',
					lines: [
						`\`${prefix}activeconfig\` · show the current defaults`,
						`\`${prefix}activeconfig option=value ...\` · change some defaults`,
						`\`${prefix}activeconfig reset\` · back to the built-in defaults (1M, 10 sessions, gexp off, playtime off, any, 30m, 4h, 12h, 10m)`
					]
				},
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
			],
			examples: [
				`${prefix}activeconfig`,
				`${prefix}activeconfig sessions=20 time=2M`,
				`${prefix}activeconfig gexp=50k match=any`,
				`${prefix}activeconfig merge_gap=15m`,
				`${prefix}activeconfig reset`
			]
		}
	}

	onCommand(message) {
		this.discord.activeConfig({ channel: message.channel, args: this.getArgs(message) })
	}
}

module.exports = ActiveConfigCommand
