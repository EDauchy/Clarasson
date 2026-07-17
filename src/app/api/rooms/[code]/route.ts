import { NextResponse } from "next/server";
import { requireUser, getRoomForMember, serializeRoom } from "@/lib/rooms";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { code } = await params;
  const room = await getRoomForMember(code, auth.user.id);
  if (!room) {
    return NextResponse.json({ error: "Room introuvable ou accès refusé." }, { status: 404 });
  }

  return NextResponse.json({ room: serializeRoom(room, auth.user.id) });
}
