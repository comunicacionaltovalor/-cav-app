import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';

    // Instructor: sin usuario + contraseña correcta
    const evalPass = process.env.EVAL_PASSWORD || 'CAV2025instructor';
    if (username === '' && password === evalPass) {
      return NextResponse.json({ ok: true, role: 'instructor' });
    }

    // RRHH: usuario "rrhh" + contraseña correcta
    const rrhhPass = process.env.RRHH_PASSWORD || 'RRHH2025';
    if (username === 'rrhh' && password === rrhhPass) {
      return NextResponse.json({ ok: true, role: 'rrhh' });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
