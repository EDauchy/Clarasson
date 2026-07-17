import { NextResponse } from "next/server";
import { generateInviteCode } from "@/lib/codes";
import { prisma } from "@/lib/prisma";
import { requireUser, serializeRoom, getRoomForMember } from "@/lib/rooms";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let code = generateInviteCode();
  for (let attempt = 0; attempt < 8; attempt++) {
    const exists = await prisma.room.findUnique({ where: { code } });
    if (!exists) break;
    code = generateInviteCode();
  }

  const room = await prisma.room.create({
    data: {
      code,
      members: {
        create: { userId: auth.user.id },
      },
    },
  });

  const full = await getRoomForMember(room.code, auth.user.id);
  if (!full) {
    return NextResponse.json({ error: "Erreur création room" }, { status: 500 });
  }

  return NextResponse.json({ room: serializeRoom(full, auth.user.id) }, { status: 201 });
}
