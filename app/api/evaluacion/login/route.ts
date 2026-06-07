import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Instructor: sin usuario o usuario vacío + contraseña correcta
    if ((!username || username.trim() === '') && password === process.env.EVAL_PASSWORD) {
      return NextResponse.json({ ok: true, role: 'instructor' });
    }

    // RRHH: usuario + contraseña correctos
    const rrhhUser = process.env.RRHH_USER || 'rrhh';
    const rrhhPass = process.env.RRHH_PASSWORD || 'RRHH2025';
    if (
      username?.trim().toLowerCase() === rrhhUser.toLowerCase() &&
      password === rrhhPass
    ) {
      return NextResponse.json({ ok: true, role: 'rrhh' });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
