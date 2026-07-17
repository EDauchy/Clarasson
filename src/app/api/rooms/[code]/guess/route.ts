import { NextResponse } from "next/server";
import { z } from "zod";
import { updateRooms } from "@/lib/store";
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
  const roomCheck = await getRoomForMember(code, auth.user.id);
  if (!roomCheck) {
    return NextResponse.json({ error: "Room introuvable ou accès refusé." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choix invalide." }, { status: 400 });
  }

  let errorMessage: string | null = null;

  await updateRooms((rooms) => {
    const target = rooms.find((r) => r.code === code.toUpperCase());
    if (!target) {
      errorMessage = "Room introuvable.";
      return null;
    }
    const question = target.questions.find((q) => q.id === parsed.data.questionId);
    if (!question) {
      errorMessage = "Question introuvable.";
      return null;
    }
    if (question.phase !== "waiting_guess") {
      errorMessage = "Ce n'est pas encore la phase de guess.";
      return null;
    }

    const myAnswer = question.answers.find((a) => a.userId === auth.user.id);
    if (!myAnswer?.ownChoice) {
      errorMessage = "Tu dois d'abord répondre pour toi.";
      return null;
    }
    if (myAnswer.guessChoice) {
      errorMessage = "Tu as déjà deviné.";
      return null;
    }

    myAnswer.guessChoice = parsed.data.choice;

    const bothReady =
      target.members.length === 2 &&
      target.members.every((m) =>
        question.answers.some((a) => a.userId === m.userId && a.guessChoice)
      );
    if (bothReady) question.phase = "revealed";

    return target;
  });

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const updated = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(updated!, auth.user.id) });
}
