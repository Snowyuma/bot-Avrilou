import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type Birthday = {
  guildId: string;
  userId: string;
  day: number;
  month: number;
  lastCelebratedYear?: number;
};

const file = resolve(process.env.DATA_DIR?.trim() || ".", "birthdays.json");
let birthdays: Birthday[] = [];

export async function loadBirthdays() {
  try {
    const data = JSON.parse(await readFile(file, "utf8")) as Birthday[];
    birthdays = Array.isArray(data) ? data : [];
  } catch {
    birthdays = [];
  }
}

async function save() {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(birthdays, null, 2), "utf8");
}

export async function saveBirthday(birthday: Omit<Birthday, "lastCelebratedYear">) {
  const previous = birthdays.find((item) => item.guildId === birthday.guildId && item.userId === birthday.userId);
  birthdays = birthdays.filter((item) => item.guildId !== birthday.guildId || item.userId !== birthday.userId);
  birthdays.push({ ...birthday, lastCelebratedYear: previous?.lastCelebratedYear });
  await save();
}

export function getDueBirthdays(guildId: string, day: number, month: number, year: number): Birthday[] {
  return birthdays.filter(
    (birthday) =>
      birthday.guildId === guildId &&
      birthday.day === day &&
      birthday.month === month &&
      birthday.lastCelebratedYear !== year,
  );
}

export async function markBirthdayCelebrated(guildId: string, userId: string, year: number) {
  const birthday = birthdays.find((item) => item.guildId === guildId && item.userId === userId);
  if (!birthday) return;
  birthday.lastCelebratedYear = year;
  await save();
}
