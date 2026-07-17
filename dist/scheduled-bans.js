import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const file = resolve(process.env.DATA_DIR?.trim() || ".", "scheduled-bans.json");
let bans = [];
export async function loadScheduledBans() {
    try {
        bans = JSON.parse(await readFile(file, "utf8"));
    }
    catch {
        bans = [];
    }
}
async function save() {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(bans, null, 2), "utf8");
}
export async function scheduleBan(ban) {
    bans = bans.filter((item) => item.guildId !== ban.guildId || item.userId !== ban.userId);
    bans.push(ban);
    await save();
}
export async function cancelScheduledBan(guildId, userId) {
    const next = bans.filter((item) => item.guildId !== guildId || item.userId !== userId);
    if (next.length !== bans.length) {
        bans = next;
        await save();
    }
}
export async function takeExpiredBans(now = Date.now()) {
    const expired = bans.filter((item) => item.expiresAt <= now);
    if (expired.length) {
        bans = bans.filter((item) => item.expiresAt > now);
        await save();
    }
    return expired;
}
