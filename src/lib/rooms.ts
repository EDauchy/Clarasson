import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  return { user: session.user };
}

export async function getRoomForMember(code: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      questions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          answers: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!room) return null;
  if (!room.members.some((m) => m.userId === userId)) return null;
  return room;
}

export type PublicAnswer = {
  userId: string;
  userName: string;
  hasOwn: boolean;
  hasGuess: boolean;
  ownChoice?: string | null;
  guessChoice?: string | null;
};

export function serializeRoom(
  room: NonNullable<Awaited<ReturnType<typeof getRoomForMember>>>,
  viewerId: string
) {
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
