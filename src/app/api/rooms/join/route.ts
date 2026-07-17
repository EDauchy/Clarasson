import { NextResponse } from "next/server";
import { z } from "zod";
import { findRoomByCode, updateRooms } from "@/lib/store";
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
  const room = await findRoomByCode(code);

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

  await updateRooms((rooms) => {
    const target = rooms.find((r) => r.code === code);
    if (!target) return null;
    if (target.members.length >= 2) return null;
    if (target.members.some((m) => m.userId === auth.user.id)) return target;
    target.members.push({ userId: auth.user.id, joinedAt: new Date().toISOString() });
    return target;
  });

  const full = await getRoomForMember(code, auth.user.id);
  return NextResponse.json({ room: serializeRoom(full!, auth.user.id) });
}
