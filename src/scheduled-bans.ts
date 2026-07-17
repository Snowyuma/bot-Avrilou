import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ScheduledBan = { guildId: string; userId: string; expiresAt: number };
const file = resolve(process.env.DATA_DIR?.trim() || ".", "scheduled-bans.json");
let bans: ScheduledBan[] = [];

export async function loadScheduledBans() {
  try { bans = JSON.parse(await readFile(file, "utf8")) as ScheduledBan[]; }
  catch { bans = []; }
}

async function save() {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(bans, null, 2), "utf8");
}

export async function scheduleBan(ban: ScheduledBan) {
  bans = bans.filter((item) => item.guildId !== ban.guildId || item.userId !== ban.userId);
  bans.push(ban);
  await save();
}

export async function cancelScheduledBan(guildId: string, userId: string) {
  const next = bans.filter((item) => item.guildId !== guildId || item.userId !== userId);
  if (next.length !== bans.length) { bans = next; await save(); }
}

export async function takeExpiredBans(now = Date.now()): Promise<ScheduledBan[]> {
  const expired = bans.filter((item) => item.expiresAt <= now);
  if (expired.length) { bans = bans.filter((item) => item.expiresAt > now); await save(); }
  return expired;
}
