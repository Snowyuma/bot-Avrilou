import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const file = resolve(process.env.DATA_DIR?.trim() || ".", "warnings.json");
let warnings = [];
export async function loadWarnings() {
    try {
        const data = JSON.parse(await readFile(file, "utf8"));
        warnings = Array.isArray(data) ? data : [];
    }
    catch {
        warnings = [];
    }
}
async function save() {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(warnings, null, 2), "utf8");
}
export async function addWarning(warning) {
    warnings.push(warning);
    await save();
    return getWarnings(warning.guildId, warning.userId).length;
}
export function getWarnings(guildId, userId) {
    return warnings
        .filter((warning) => warning.guildId === guildId && warning.userId === userId)
        .sort((a, b) => a.createdAt - b.createdAt);
}
export async function removeLatestWarning(guildId, userId) {
    const index = warnings.reduce((latest, warning, current) => warning.guildId === guildId &&
        warning.userId === userId &&
        (latest === -1 || warning.createdAt > warnings[latest].createdAt)
        ? current
        : latest, -1);
    if (index === -1)
        return null;
    const [removed] = warnings.splice(index, 1);
    await save();
    return removed ?? null;
}
