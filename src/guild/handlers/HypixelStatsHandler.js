const { hypixelGet } = require("./HypixelApiHandler.js")

const classxps = [
  50, 75, 110, 160, 230, 330, 470, 670, 950, 1340,
  1890, 2665, 3760, 5260, 7380, 10300, 14400, 20000,
  27600, 38000, 52500, 71500, 97000, 132000, 180000,
  243000, 328000, 445000, 600000, 800000,
  1065000, 1410000, 1900000, 2500000, 3300000,
  4300000, 5600000, 7200000, 9200000, 12000000,
  15000000, 19000000, 24000000, 30000000,
  38000000, 48000000, 60000000, 75000000,
  93000000, 116250000
];

const skillxps = [
  50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500,
  5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000,
  300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000,
  1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000,
  2300000, 2400000, 2500000, 2600000, 2750000, 2900000, 3100000, 3400000, 3700000, 4000000,
  4300000, 4600000, 4900000, 5200000, 5500000, 5800000, 6100000, 6400000, 6700000, 7000000
];

const SKILL_CAPS = {
  farming: 50,
  mining: 60,
  combat: 60,
  foraging: 54,
  fishing: 50,
  enchanting: 60,
  alchemy: 50,
  taming: 60,
  carpentry: 50
};

const CLASSES = ["archer", "berserk", "healer", "mage", "tank"];
const SLAYERS = { zombie: "Rev", spider: "Tara", wolf: "Sven", enderman: "Eman", blaze: "Blaze", vampire: "Vamp" };
const DEFAULT_XP_PER_RUN = 250000;
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

function calculateProgress(currentXp, xpPerRun) {
  let level = 0;
  let xpIntoLevel = currentXp;
  let xpForNextLevel = 0;

  for (let i = 0; i < classxps.length; i++) {
    if (xpIntoLevel >= classxps[i]) {
      xpIntoLevel -= classxps[i];
      level++;
    } else {
      xpForNextLevel = classxps[i];
      break;
    }
  }

  if (level >= 50) {
    xpForNextLevel = 200000000;
  }

  const xpLeftToNext = Math.max(xpForNextLevel - xpIntoLevel, 0);

  const xpTo50 = classxps.reduce((a, b) => a + b, 0);
  const xpLeftTo50 = Math.max(xpTo50 - currentXp, 0);

  const percent = Math.min((xpIntoLevel / xpForNextLevel) * 100, 100);

  return {
    level,
    percent: percent.toFixed(2),
    xpIntoLevel: Math.floor(xpIntoLevel),
    xpLeftToNext: Math.floor(xpLeftToNext),
    xpLeftTo50: Math.floor(xpLeftTo50),
    runsToNext: Math.ceil(xpLeftToNext / xpPerRun),
    runsTo50: Math.ceil(xpLeftTo50 / xpPerRun)
  };
}

function skillLevel(xp, cap) {
  let level = 0;
  let remaining = xp;

  while (level < cap && remaining >= skillxps[level]) {
    remaining -= skillxps[level];
    level++;
  }

  if (level >= cap) return level;
  return level + remaining / skillxps[level];
}

function slayerLevel(boss) {
  const claimed = Object.keys(boss?.claimed_levels || {})
    .map(k => parseInt(k.replace("level_", ""), 10))
    .filter(n => !isNaN(n));
  return claimed.length ? Math.max(...claimed) : 0;
}

function skyblockStats(profile, member) {
  const experience = member.player_data?.experience || {};
  const farmingCap = SKILL_CAPS.farming + (member.jacobs_contest?.perks?.farming_level_cap || 0);

  const skills = {};
  for (const [skill, baseCap] of Object.entries(SKILL_CAPS)) {
    const cap = skill === "farming" ? farmingCap : baseCap;
    const xp = experience[`SKILL_${skill.toUpperCase()}`] || 0;
    skills[skill] = { level: skillLevel(xp, cap), cap };
  }

  const skillLevels = Object.values(skills).map(s => s.level);
  const slayerBosses = member.slayer?.slayer_bosses || {};

  return {
    level: (member.leveling?.experience || 0) / 100,
    skills,
    skillAverage: skillLevels.reduce((a, b) => a + b, 0) / skillLevels.length,
    slayers: Object.fromEntries(
      Object.keys(SLAYERS).map(s => [s, { level: slayerLevel(slayerBosses[s]), xp: slayerBosses[s]?.xp || 0 }])
    ),
    magicalPower: member.accessory_bag_storage?.highest_magical_power || 0,
    purse: member.currencies?.coin_purse || 0,
    bank: profile.banking?.balance ?? null,
    fairySouls: member.fairy_soul?.total_collected || 0,
    deaths: member.player_data?.death_count || 0,
    pets: member.pets_data?.pets?.length || 0,
    firstJoin: member.profile?.first_join ? Math.floor(member.profile.first_join / 1000) : null
  };
}

function dungeonStats(member) {
  const dungeons = member.dungeons || {};
  const catacombs = dungeons.dungeon_types?.catacombs || {};
  const master = dungeons.dungeon_types?.master_catacombs || {};

  return {
    selectedClass: dungeons.selected_dungeon_class ?? null,
    secrets: dungeons.secrets || 0,
    highestFloor: catacombs.highest_tier_completed ?? null,
    highestMaster: master.highest_tier_completed ?? null,
    runs: catacombs.tier_completions?.total || 0,
    masterRuns: master.tier_completions?.total || 0,
    catacombs: calculateProgress(catacombs.experience || 0, DEFAULT_XP_PER_RUN),
    classes: Object.fromEntries(
      CLASSES.map(c => [
        c,
        calculateProgress(dungeons.player_classes?.[c]?.experience || 0, DEFAULT_XP_PER_RUN)
      ])
    )
  };
}

async function guildStats(cleanUuid, apiKey) {
  const data = await hypixelGet(`guild?player=${cleanUuid}`, apiKey);
  if (!data.guild) return null;

  const member = data.guild.members?.find(m => m.uuid === cleanUuid);
  if (!member) return null;

  const days = Object.entries(member.expHistory || {});
  const weekly = days.reduce((sum, [, xp]) => sum + xp, 0);

  return {
    name: data.guild.name,
    rank: member.rank,
    joined: member.joined ? Math.floor(member.joined / 1000) : null,
    days,
    weekly
  };
}

async function getPlayerStats(uuid, apiKey) {
  const cleanUuid = uuid.replaceAll("-", "").toLowerCase();

  const cached = cache.get(cleanUuid);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.stats;

  const [profilesResult, guildResult] = await Promise.allSettled([
    hypixelGet(`skyblock/profiles?uuid=${cleanUuid}`, apiKey),
    guildStats(cleanUuid, apiKey)
  ]);

  const stats = { profile: null, skyblock: null, dungeons: null, guild: null, errors: [] };

  if (profilesResult.status === "fulfilled") {
    const profile = (profilesResult.value.profiles || []).find(p => p.selected);
    const member = profile?.members?.[cleanUuid];
    if (member) {
      stats.profile = profile.cute_name;
      stats.skyblock = skyblockStats(profile, member);
      stats.dungeons = dungeonStats(member);
    }
  } else {
    stats.errors.push(`SkyBlock: ${profilesResult.reason.message}`);
  }

  if (guildResult.status === "fulfilled") {
    stats.guild = guildResult.value;
  } else {
    stats.errors.push(`Guild: ${guildResult.reason.message}`);
  }

  if (stats.errors.length === 0) {
    cache.set(cleanUuid, { time: Date.now(), stats });
  }

  return stats;
}

async function main() {
  try {
    const [uuid] = process.argv.slice(2);
    const stats = await getPlayerStats(uuid, process.env.HYPIXEL_API_KEY);
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getPlayerStats, calculateProgress, skillLevel };
