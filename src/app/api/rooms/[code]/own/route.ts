import { NextResponse } from "next/server";
import { z } from "zod";
import { newId, updateRooms } from "@/lib/store";
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
    if (question.phase !== "waiting_own") {
      errorMessage = "Ce n'est plus la phase de choix secret.";
      return null;
    }

    let answer = question.answers.find((a) => a.userId === auth.user.id);
    if (answer?.ownChoice) {
      errorMessage = "Tu as déjà répondu.";
      return null;
    }
    if (!answer) {
      answer = {
        id: newId(),
        userId: auth.user.id,
        ownChoice: parsed.data.choice,
        guessChoice: null,
      };
      question.answers.push(answer);
    } else {
      answer.ownChoice = parsed.data.choice;
    }

    const bothReady =
      target.members.length === 2 &&
      target.members.every((m) =>
        question.answers.some((a) => a.userId === m.userId && a.ownChoice)
      );
    if (bothReady) question.phase = "waiting_guess";

    return target;
  });

  if (errorMessage) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const updated = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(updated!, auth.user.id) });
}
