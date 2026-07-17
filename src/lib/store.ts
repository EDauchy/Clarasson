import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

export type AnswerRecord = {
  id: string;
  userId: string;
  ownChoice: string | null;
  guessChoice: string | null;
};

export type QuestionRecord = {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
  phase: "waiting_own" | "waiting_guess" | "revealed";
  createdAt: string;
  answers: AnswerRecord[];
};

export type MemberRecord = {
  userId: string;
  joinedAt: string;
};

export type RoomRecord = {
  id: string;
  code: string;
  createdAt: string;
  members: MemberRecord[];
  questions: QuestionRecord[];
};

type UsersFile = { users: UserRecord[] };
type RoomsFile = { rooms: RoomRecord[] };

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");

let queue: Promise<void> = Promise.resolve();

function newId() {
  return randomBytes(12).toString("hex");
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
  try {
    await fs.access(ROOMS_FILE);
  } catch {
    await fs.writeFile(ROOMS_FILE, JSON.stringify({ rooms: [] }, null, 2), "utf8");
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDataFiles();
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDataFiles();
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function findUserByEmail(email: string) {
  const data = await readJson<UsersFile>(USERS_FILE, { users: [] });
  return data.users.find((u) => u.email === email.toLowerCase().trim()) ?? null;
}

export async function findUserById(id: string) {
  const data = await readJson<UsersFile>(USERS_FILE, { users: [] });
  return data.users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserRecord> {
  return withLock(async () => {
    const data = await readJson<UsersFile>(USERS_FILE, { users: [] });
    const email = input.email.toLowerCase().trim();
    if (data.users.some((u) => u.email === email)) {
      throw new Error("EMAIL_TAKEN");
    }
    const user: UserRecord = {
      id: newId(),
      email,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    await writeJson(USERS_FILE, data);
    return user;
  });
}

export async function findRoomByCode(code: string) {
  const data = await readJson<RoomsFile>(ROOMS_FILE, { rooms: [] });
  return data.rooms.find((r) => r.code === code.toUpperCase()) ?? null;
}

export async function updateRooms(
  mutator: (rooms: RoomRecord[]) => RoomRecord | null | void
): Promise<RoomRecord | null> {
  return withLock(async () => {
    const data = await readJson<RoomsFile>(ROOMS_FILE, { rooms: [] });
    const result = mutator(data.rooms) ?? null;
    await writeJson(ROOMS_FILE, data);
    return result;
  });
}

export async function createRoom(code: string, creatorUserId: string) {
  return updateRooms((rooms) => {
    if (rooms.some((r) => r.code === code)) return null;
    const room: RoomRecord = {
      id: newId(),
      code,
      createdAt: new Date().toISOString(),
      members: [{ userId: creatorUserId, joinedAt: new Date().toISOString() }],
      questions: [],
    };
    rooms.push(room);
    return room;
  });
}

export { newId };
