import { NextResponse } from "next/server";

import { demoLoginUsers, loginSchema } from "@/lib/auth-config";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = demoLoginUsers.find(
    (item) =>
      (item.nationalId === parsed.data.nationalId ||
        item.username === parsed.data.nationalId) &&
      item.password === parsed.data.password
  );

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "ת.ז או סיסמה לא נכונים"
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      nationalId: user.nationalId,
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
      emailVerified: true,
      mustChangePassword: user.mustChangePassword
    }
  });
}
