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
export const config = {
    token: required("DISCORD_TOKEN"),
    clientId: required("CLIENT_ID"),
    guildId: required("GUILD_ID"),
    announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID?.trim(),
    modLogChannelId: process.env.MOD_LOG_CHANNEL_ID?.trim(),
    antiRaidEnabled: process.env.ANTI_RAID_ENABLED !== "false",
    raidJoinLimit: positiveNumber("RAID_JOIN_LIMIT", 8),
    raidWindowMs: positiveNumber("RAID_WINDOW_SECONDS", 15) * 1000,
    minAccountAgeMs: positiveNumber("MIN_ACCOUNT_AGE_HOURS", 24) * 3_600_000,
    quarantineRoleId: process.env.QUARANTINE_ROLE_ID?.trim(),
    blockedWords: (process.env.BLOCKED_WORDS ?? "")
        .split(",")
        .map((word) => word.trim().toLocaleLowerCase("fr"))
        .filter(Boolean),
};
