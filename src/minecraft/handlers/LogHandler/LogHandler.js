const fs = require('fs')
const path = require('path')
const logsFilePath = path.join(__dirname, 'logs.json')
const logUtils = require('./logUtils.js')

let logs = {}
if (fs.existsSync(logsFilePath)) {
    logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf-8'))
}

const playerUuidKey = 'playerUuid'
const playerNameKey = 'playerName'
const lastJoinKey = 'lastJoin'
const lastExitKey = 'lastExit'
const lastToLastExitKey = 'lastLastExit'
const lastLongJoinKey = 'lastLongJoin'
const guildRankKey = 'guildRank'
const playerCommentsKey = 'comments'
const numHoursKey = 'numHours'

const maxReconnectSessionMins = 5
const maxReconnectSessionMillis = maxReconnectSessionMins * 60 * 1000

let lastGuildUpdateTimestamp = 0
const guildUpdateIntervalDays = 3
const guildUpdateIntervalMins = guildUpdateIntervalDays * 24 * 60
const guildUpdateIntervalMillis = guildUpdateIntervalMins * 60 * 1000


const minsForLongJoin = 30
const minsForReconnectTimeout = 60 * 2
const minsForJoinLogTimeout = 60 * 24

const minsForActivityRange = 60 * 24 * 60
const numLongJoinsForActivity = 20

const ignWidth = 20
const lastJoinWidth = 15
const lastLongJoinsWidth = 50
const numLongJoinsWidth = 15
const numHoursWidth = 15

// const printTimezone = pytz.timezone('US/Eastern')

const minsForRawPromotionActivityRange = 60 * 24 * 7
const numLongJoinsForRawPromotion = 3
const minsForRawJoinDatePromotionRange = 60 * 24 * 30

const minsForBoiledPromotionActivityRange = 60 * 24 * 7
const numLongJoinsForBoiledPromotion = 3
const minsForBoiledJoinDatePromotionRange = 60 * 24 * 91

const scrambledSbLevel = 280

const maxTimePerLoginMins = 4 * 60
const totalTimeForActivityMins = 25 * 60

const guildListFilename = "data/guild_list.txt"
const sbLevelListFilename = "data/sb_level_list.txt"

function saveLogsToFile() {
    delete logs["Quickdesh"]
    fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2), 'utf-8')
}

// player here is the uuid to make comparisions easier with name changes
async function updatePlayer(player, data, fromGuildRefresh = false) {
    const keys = [playerUuidKey, playerNameKey, lastJoinKey, lastExitKey, lastToLastExitKey, guildRankKey, lastLongJoinKey, playerCommentsKey]
    const defaultValues = ["unknown uuid", "unknown name", 0, 0, 0, "unassigned rank", "unknown last join", ""]

    if (!logs[player]) {
        logs[player] = {}
        for (let i = 0; i < keys.length; i++) {
            logs[player][keys[i]] = defaultValues[i]
        }
    }

    const lastExitTimestamp = logs[player][lastExitKey]

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const defaultValue = defaultValues[i]

        if (data[key] !== undefined && data[key] !== defaultValue) {
            logs[player][key] = data[key]
        }
    }
    
    if (logs[player][lastJoinKey] - logs[player][lastExitKey] > maxReconnectSessionMillis) {
        logs[player][lastToLastExitKey] = lastExitTimestamp
    } else {
        logs[player][lastExitKey] = logs[player][lastToLastExitKey]
    }   
}

async function getPlayerDetailsByName(username, addIfMissing = false) {
    for (const [uuid, playerDetails] of Object.entries(logs)) {
        if (playerDetails[playerNameKey] === username) {
            return playerDetails
        }
    }

    if (addIfMissing) {
        const newPlayerDetails = await logUtils.processInBatches([username])
        updatePlayer(newPlayerDetails[playerUuidKey], {})
    }

    return null
}

async function getPlayerDetailsByUuid(uuidName) {
    if (uuidName in logs) {
        return logs[uuidName]
    } else {
      return null
    }
}

module.exports = {
    getPlayerDetailsByName,
    addPlayer: async function(player) {
        const newPlayerDetails = await logUtils.processInBatches([player])
        await updatePlayer(newPlayerDetails[playerUuidKey], { [playerNameKey]: newPlayerDetails[playerNameKey], [lastJoinKey]: Date.now() })
        await saveLogsToFile()
    },
    deletePlayer: async function(player) {
        delete logs[await getPlayerDetailsByName(player, false)[playerUuidKey]]
        await saveLogsToFile()
    },
    playerJoined: async function(player) {
        await updatePlayer(await getPlayerDetailsByName(player, true)[playerUuidKey], { [lastJoinKey]: Date.now() })
        await saveLogsToFile()
    },
    playerLeft: async function(player) {
        await updatePlayer(await getPlayerDetailsByName(player, true)[playerUuidKey], { [lastExitKey]: Date.now() })
        await saveLogsToFile()
    },
    updateGuildList: async function(gr, gm, forceFullReset = false) {

        if (Date.now() - lastGuildUpdateTimestamp < guildUpdateIntervalMillis) {
            return
        }

        lastGuildUpdateTimestamp = Date.now()

        const guildRanks = gr.slice(0 , -1).split(",")
        const guildMembers = gm.slice(0 , -1).split(",")

        const regex = /(?:\[(?:VIP\+{0,2}|MVP\+{0,2})\])?\s*([^\s●]+)\s*●/g

        for (let i = 0; i < guildRanks.length; i++) {
            let match
            const usernames = []

            while ((match = regex.exec(guildMembers[i])) !== null) {
                usernames.push(match[1])
            }

            const fromGuildRefresh = true
            const usernamesToPull = []
            let pulledProfiles = []

            if (forceFullReset) {
                pulledProfiles = await logUtils.processInBatches(usernames)
            } else {
                for (const uname of usernames) {
                    const details = await getPlayerDetailsByName(uname)

                    if (details == null) {
                        usernamesToPull.push(uname)
                    } else {
                        await updatePlayer(
                            details[playerUuidKey], 
                            {
                                [playerUuidKey]: details[playerUuidKey],
                                [playerNameKey]: details[playerNameKey],
                                [guildRankKey]: guildRanks[i].replace(/^--\s*|\s*--$/g, "")
                            }, 
                            fromGuildRefresh
                        )
                    }
                }

                pulledProfiles = await logUtils.processInBatches(usernamesToPull)
            }

            
            for (const p of pulledProfiles) {
                await updatePlayer(
                    p.id, 
                    {
                        [playerUuidKey]: p.id,
                        [playerNameKey]: p.name,
                        [guildRankKey]: guildRanks[i].replace(/^--\s*|\s*--$/g, "")
                    }, 
                    fromGuildRefresh
                )
            }
            saveLogsToFile()
        }
    }
}
