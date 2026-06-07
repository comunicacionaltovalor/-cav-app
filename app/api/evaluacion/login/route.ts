import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Instructor: sin usuario o usuario vacío + contraseña correcta
    if ((!username || username.trim() === '') && password === process.env.EVAL_PASSWORD) {
      return NextResponse.json({ ok: true, role: 'instructor' });
    }

    // RRHH: usuario + contraseña correctos
    if (
      username?.trim().toLowerCase() === process.env.RRHH_USER?.toLowerCase() &&
      password === process.env.RRHH_PASSWORD
    ) {
      return NextResponse.json({ ok: true, role: 'rrhh' });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
