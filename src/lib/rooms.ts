import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  findRoomByCode,
  findUserById,
  type AnswerRecord,
  type QuestionRecord,
  type RoomRecord,
} from "@/lib/store";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  return { user: session.user };
}

export type EnrichedAnswer = AnswerRecord & { user: { id: string; name: string } };
export type EnrichedQuestion = Omit<QuestionRecord, "answers"> & {
  answers: EnrichedAnswer[];
};

export type RoomView = {
  id: string;
  code: string;
  members: { userId: string; joinedAt: string; user: { id: string; name: string; email: string } }[];
  questions: EnrichedQuestion[];
};

export async function getRoomForMember(
  code: string,
  userId: string
): Promise<RoomView | null> {
  const room = await findRoomByCode(code);
  if (!room) return null;
  if (!room.members.some((m) => m.userId === userId)) return null;

  const members = [];
  for (const m of [...room.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))) {
    const user = await findUserById(m.userId);
    if (!user) continue;
    members.push({
      userId: m.userId,
      joinedAt: m.joinedAt,
      user: { id: user.id, name: user.name, email: user.email },
    });
  }

  const latest = [...room.questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const questions = latest
    ? [
        {
          ...latest,
          answers: await Promise.all(
            latest.answers.map(async (a) => {
              const user = await findUserById(a.userId);
              return {
                ...a,
                user: { id: a.userId, name: user?.name ?? "?" },
              };
            })
          ),
        },
      ]
    : [];

  return { id: room.id, code: room.code, members, questions };
}

export type PublicAnswer = {
  userId: string;
  userName: string;
  hasOwn: boolean;
  hasGuess: boolean;
  ownChoice?: string | null;
  guessChoice?: string | null;
};

export function serializeRoom(room: RoomView, viewerId: string) {
  const question = room.questions[0] ?? null;
  const partner = room.members.find((m) => m.userId !== viewerId)?.user ?? null;

  let answers: PublicAnswer[] | null = null;
  if (question) {
    answers = question.answers.map((a) => {
      const isViewer = a.userId === viewerId;
      const revealed = question.phase === "revealed";
      return {
        userId: a.userId,
        userName: a.user.name,
        hasOwn: Boolean(a.ownChoice),
        hasGuess: Boolean(a.guessChoice),
        ownChoice: revealed || (isViewer && a.ownChoice) ? a.ownChoice : undefined,
        guessChoice: revealed || (isViewer && a.guessChoice) ? a.guessChoice : undefined,
      };
    });
  }

  return {
    id: room.id,
    code: room.code,
    memberCount: room.members.length,
    isFull: room.members.length >= 2,
    members: room.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
    })),
    partner: partner ? { id: partner.id, name: partner.name } : null,
    question: question
      ? {
          id: question.id,
          prompt: question.prompt,
          optionA: question.optionA,
          optionB: question.optionB,
          phase: question.phase,
          answers,
        }
      : null,
  };
}

export function getLatestQuestion(room: RoomRecord) {
  return [...room.questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
