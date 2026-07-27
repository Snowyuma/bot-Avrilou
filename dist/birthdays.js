import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const file = resolve(process.env.DATA_DIR?.trim() || ".", "birthdays.json");
let birthdays = [];
export async function loadBirthdays() {
    try {
        const data = JSON.parse(await readFile(file, "utf8"));
        birthdays = Array.isArray(data) ? data : [];
    }
    catch {
        birthdays = [];
    }
}
async function save() {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(birthdays, null, 2), "utf8");
}
export async function saveBirthday(birthday) {
    const previous = birthdays.find((item) => item.guildId === birthday.guildId && item.userId === birthday.userId);
    birthdays = birthdays.filter((item) => item.guildId !== birthday.guildId || item.userId !== birthday.userId);
    birthdays.push({ ...birthday, lastCelebratedYear: previous?.lastCelebratedYear });
    await save();
}
export function getDueBirthdays(guildId, day, month, year) {
    return birthdays.filter((birthday) => birthday.guildId === guildId &&
        birthday.day === day &&
        birthday.month === month &&
        birthday.lastCelebratedYear !== year);
}
export async function markBirthdayCelebrated(guildId, userId, year) {
    const birthday = birthdays.find((item) => item.guildId === guildId && item.userId === userId);
    if (!birthday)
        return;
    birthday.lastCelebratedYear = year;
    await save();
}
