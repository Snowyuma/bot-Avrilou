import "dotenv/config";
function required(name) {
    const value = process.env[name]?.trim();
    if (!value)
        throw new Error(`Variable d'environnement manquante : ${name}`);
    return value;
}
function positiveNumber(name, fallback) {
    const raw = process.env[name];
    const value = raw === undefined ? fallback : Number(raw);
    if (!Number.isFinite(value) || value < 0)
        throw new Error(`${name} doit être un nombre positif.`);
    return value;
}
const primaryGuild = {
    guildId: required("GUILD_ID"),
    announcementChannelIds: (process.env.ANNOUNCEMENT_CHANNEL_IDS ?? process.env.ANNOUNCEMENT_CHANNEL_ID ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    modLogChannelId: process.env.MOD_LOG_CHANNEL_ID?.trim() || process.env.ACTIVITY_LOG_CHANNEL_ID?.trim() || "1532081947872858132",
    activityLogChannelId: process.env.ACTIVITY_LOG_CHANNEL_ID?.trim() || "1532081947872858132",
    birthdayChannelId: process.env.BIRTHDAY_CHANNEL_ID?.trim() || "1527951057538256896",
    birthdayRegistrationChannelId: process.env.BIRTHDAY_REGISTRATION_CHANNEL_ID?.trim() || "1532086608231268604",
    antiRaidEnabled: process.env.ANTI_RAID_ENABLED !== "false",
    raidJoinLimit: positiveNumber("RAID_JOIN_LIMIT", 8),
    raidWindowMs: positiveNumber("RAID_WINDOW_SECONDS", 15) * 1000,
    minAccountAgeMs: positiveNumber("MIN_ACCOUNT_AGE_HOURS", 24) * 3_600_000,
    quarantineRoleId: process.env.QUARANTINE_ROLE_ID?.trim(),
    kickYoungAccounts: false,
    blockedWords: (process.env.BLOCKED_WORDS ?? "")
        .split(",")
        .map((word) => word.trim().toLocaleLowerCase("fr"))
        .filter(Boolean),
    snowReaction: false,
};
const friendGuild = {
    guildId: "1465840945001140247",
    announcementChannelIds: [
        "1466541810729095421",
        "1466545564652015915",
        "1532174715920318674",
        "1466541896737362134",
        "1465840946192318659",
        "1465852998818463744",
        "1465853081534070874",
        "1465840946192318660",
        "1465854566972002470",
        "1465855553254461612",
        "1465855051410178171",
        "1501517571269333083",
        "1465855199611588841",
        "1465840946192318664",
        "1465840946355634196",
        "1465856068080107754",
        "1465840946192318662",
        "1465840946192318663",
        "1465857736259408045",
        "1466511243409096899",
        "1465856806386405641",
        "1465856560805711872",
        "1501512487940391015",
        "1465840946192318666",
        "1465840946192318667",
        "1465857298768330802",
        "1529778062001049761",
    ],
    modLogChannelId: "1532174715920318674",
    activityLogChannelId: "1532174715920318674",
    birthdayChannelId: "1465840946192318662",
    birthdayRegistrationChannelId: "1465856560805711872",
    antiRaidEnabled: true,
    raidJoinLimit: 4,
    raidWindowMs: 10_000,
    minAccountAgeMs: 30 * 86_400_000,
    kickYoungAccounts: true,
    blockedWords: ["yumyum", "mon cerf"],
    snowReaction: true,
    spamMessageLimit: 10,
    spamWindowMs: 1_000,
    spamTimeoutMs: 24 * 60 * 60_000,
};
const protectedGuild = {
    guildId: "1280818990226346070",
    announcementChannelIds: [
        "1289751044301000714",
        "1281135036803977248",
        "1317848259976499240",
        "1494845124109275417",
        "1495152053574566133",
        "1419021315393982687",
        "1419021751287025866",
        "1294682192026275960",
        "1281136545725939763",
        "1426174482883678359",
        "1493030551958065233",
        "1517246060110549071",
        "1520581782813147156",
        "1523824555523571804",
        "1429383068371648552",
        "1525471270018351114",
        "1524996179807567902",
        "1531342839638786068",
        "1523476676271411220",
        "1524044890353172661",
        "1523890791318159381",
        "1524790861223952494",
        "1533188216897802391",
        "1523460426778677288",
        "1524133014831890462",
        "1289758311998161009",
        "1523477339386941561",
        "1289742367091458078",
        "1536168760077983744",
    ],
    modLogChannelId: "1536168760077983744",
    activityLogChannelId: "1536168760077983744",
    birthdayChannelId: "",
    birthdayRegistrationChannelId: "",
    antiRaidEnabled: true,
    raidJoinLimit: 4,
    raidWindowMs: 10_000,
    minAccountAgeMs: 30 * 86_400_000,
    kickYoungAccounts: true,
    blockedWords: ["hitler", "hiitler"],
    snowReaction: false,
    spamMessageLimit: 10,
    spamWindowMs: 1_000,
    spamTimeoutMs: 24 * 60 * 60_000,
};
export const config = {
    token: required("DISCORD_TOKEN"),
    clientId: required("CLIENT_ID"),
    guilds: new Map([primaryGuild, friendGuild, protectedGuild].map((guild) => [guild.guildId, guild])),
};
export function getGuildConfig(guildId) {
    return config.guilds.get(guildId);
}
