import { NextResponse } from "next/server";
import { z } from "zod";
import { newId, updateRooms } from "@/lib/store";
import { requireUser, getRoomForMember, serializeRoom, getLatestQuestion } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

const schema = z.object({
  prompt: z.string().trim().min(1).max(120).optional(),
  optionA: z.string().trim().min(1).max(80),
  optionB: z.string().trim().min(1).max(80),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { code } = await params;
  const room = await getRoomForMember(code, auth.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room introuvable ou accès refusé." }, { status: 404 });
  }
  if (room.members.length < 2) {
    return NextResponse.json(
      { error: "Attends que ton partenaire rejoigne la room." },
      { status: 400 }
    );
  }

  const active = room.questions[0];
  if (active && active.phase !== "revealed") {
    return NextResponse.json(
      { error: "Une question est déjà en cours." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Propose deux options valides." }, { status: 400 });
  }

  if (parsed.data.optionA.toLowerCase() === parsed.data.optionB.toLowerCase()) {
    return NextResponse.json({ error: "Les deux options doivent être différentes." }, { status: 400 });
  }

  const updated = await updateRooms((rooms) => {
    const target = rooms.find((r) => r.code === code.toUpperCase());
    if (!target) return null;
    const latest = getLatestQuestion(target);
    if (latest && latest.phase !== "revealed") return null;
    target.questions.push({
      id: newId(),
      prompt: parsed.data.prompt?.trim() || "Tu préfères",
      optionA: parsed.data.optionA.trim(),
      optionB: parsed.data.optionB.trim(),
      phase: "waiting_own",
      createdAt: new Date().toISOString(),
      answers: [],
    });
    return target;
  });

  if (!updated) {
    return NextResponse.json({ error: "Impossible de créer la question." }, { status: 400 });
  }

  const full = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(full!, auth.user.id) }, { status: 201 });
}
