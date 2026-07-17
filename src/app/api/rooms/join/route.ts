import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getRoomForMember, serializeRoom } from "@/lib/rooms";

const schema = z.object({
  code: z.string().trim().min(4).max(12),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Code d'invitation invalide." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase().replace(/\s+/g, "");
  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Aucune room avec ce code." }, { status: 404 });
  }

  const alreadyIn = room.members.some((m) => m.userId === auth.user.id);
  if (alreadyIn) {
    const full = await getRoomForMember(code, auth.user.id);
    return NextResponse.json({ room: serializeRoom(full!, auth.user.id) });
  }

  if (room.members.length >= 2) {
    return NextResponse.json(
      { error: "Cette room est déjà complète (2 personnes)." },
      { status: 403 }
    );
  }

  await prisma.roomMember.create({
    data: { roomId: room.id, userId: auth.user.id },
  });

  const full = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(full!, auth.user.id) });
}
