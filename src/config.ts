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
  spamMessageLimit?: number;
  spamWindowMs?: number;
  spamTimeoutMs?: number;
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

const protectedGuild: GuildConfig = {
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
  spamTimeoutMs: 10 * 60_000,
};

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  guilds: new Map([primaryGuild, friendGuild, protectedGuild].map((guild) => [guild.guildId, guild] as const)),
};

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return config.guilds.get(guildId);
}
