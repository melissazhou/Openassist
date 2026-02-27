import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createUserSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    // Non-admins get limited fields
    const select = role === "ADMIN"
      ? { id: true, username: true, displayName: true, email: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true }
      : { id: true, username: true, displayName: true, role: true };

    const users = await prisma.user.findMany({ select, orderBy: { createdAt: "asc" } });
    return NextResponse.json(users);
  } catch (err: any) {
    console.error("[users GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { username, displayName, email, password, role, department } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, displayName, email: email || undefined, passwordHash: hash, role, department },
      select: { id: true, username: true, displayName: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error("[users POST]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
