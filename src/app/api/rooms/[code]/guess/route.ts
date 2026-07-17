import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getRoomForMember, serializeRoom } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

const schema = z.object({
  questionId: z.string().min(1),
  choice: z.enum(["A", "B"]),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { code } = await params;
  const room = await getRoomForMember(code, auth.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room introuvable ou accès refusé." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choix invalide." }, { status: 400 });
  }

  const question = room.questions.find((q) => q.id === parsed.data.questionId);
  if (!question) {
    return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
  }
  if (question.phase !== "waiting_guess") {
    return NextResponse.json({ error: "Ce n'est pas encore la phase de guess." }, { status: 400 });
  }

  const myAnswer = question.answers.find((a) => a.userId === auth.user.id);
  if (!myAnswer?.ownChoice) {
    return NextResponse.json({ error: "Tu dois d'abord répondre pour toi." }, { status: 400 });
  }
  if (myAnswer.guessChoice) {
    return NextResponse.json({ error: "Tu as déjà deviné." }, { status: 400 });
  }

  await prisma.answer.update({
    where: { id: myAnswer.id },
    data: { guessChoice: parsed.data.choice },
  });

  const answers = await prisma.answer.findMany({ where: { questionId: question.id } });
  const bothReady =
    room.members.length === 2 &&
    room.members.every((m) =>
      answers.some((a) => a.userId === m.userId && a.guessChoice)
    );

  if (bothReady) {
    await prisma.question.update({
      where: { id: question.id },
      data: { phase: "revealed" },
    });
  }

  const updated = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(updated!, auth.user.id) });
}
