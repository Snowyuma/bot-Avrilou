import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} doit être un nombre positif.`);
  return value;
}

export type GuildConfig = {
  guildId: string;
  announcementChannelIds: string[];
  modLogChannelId: string;
  activityLogChannelId: string;
  birthdayChannelId: string;
  birthdayRegistrationChannelId: string;
  antiRaidEnabled: boolean;
  raidJoinLimit: number;
  raidWindowMs: number;
  minAccountAgeMs: number;
  quarantineRoleId?: string;
  kickYoungAccounts: boolean;
  blockedWords: string[];
  snowReaction: boolean;
};

const primaryGuild: GuildConfig = {
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

const friendGuild: GuildConfig = {
  guildId: "1465840945001140247",
  announcementChannelIds: [
    "1465840946192318660",
    "1465840946192318662",
    "1465840946192318663",
    "1465856560805711872",
  ],
  modLogChannelId: "1532174715920318674",
  activityLogChannelId: "1532174715920318674",
  birthdayChannelId: "1465840946192318662",
  birthdayRegistrationChannelId: "1465856560805711872",
  antiRaidEnabled: true,
  raidJoinLimit: 4,
  raidWindowMs: 10_000,
  minAccountAgeMs: 14 * 86_400_000,
  kickYoungAccounts: true,
  blockedWords: ["yumyum", "mon cerf"],
  snowReaction: true,
};

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  guilds: new Map([primaryGuild, friendGuild].map((guild) => [guild.guildId, guild] as const)),
};

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return config.guilds.get(guildId);
}
