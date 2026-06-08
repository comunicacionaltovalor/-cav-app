'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Field } from '@/components/Input';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

type Cliente = { id: string; name: string; slug: string; created_at: string };

function checkAdminAuth(): boolean {
  try {
    const raw = localStorage.getItem('admin_auth');
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function AdminHome() {
  const [authed, setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [logging, setLogging] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [name, setName]         = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (checkAdminAuth()) { setAuthed(true); load(); }
  }, []);

  async function login() {
    if (!password) return;
    setLogging(true);
    setError('');
    const res = await fetch('/api/evaluacion/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password }),
    });
    if (res.ok) {
      const ts = Date.now();
      localStorage.setItem('admin_auth', JSON.stringify({ ts }));
      localStorage.setItem('eval_auth', JSON.stringify({ ts, role: 'instructor' }));
      setAuthed(true);
      load();
    } else {
      setError('Contraseña incorrecta.');
    }
    setLogging(false);
  }

  async function load() {
    const c = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: true });
    setClientes(c.data || []);
  }

  async function saveCliente() {
    if (!name.trim()) return;
    setSaving(true);
    const slug = slugify(name);
    const ins  = await supabase
      .from('clientes')
      .insert({ name: name.toUpperCase().trim(), slug })
      .select()
      .single();
    if (ins.error) { alert(ins.error.message); setSaving(false); return; }
    setSaving(false);
    setName('');
    await load();
  }

  function logout() {
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('eval_auth');
    setAuthed(false);
    setPassword('');
  }

  // ── Login screen ──
  if (!authed) return (
    <main className="page dark" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <section className="shell" style={{ maxWidth: 460, margin: '0 auto' }}>
        <Header />
        <div className="card">
          <p className="brand" style={{ marginBottom: 14 }}>Panel de administración</p>
          <h1 className="headline" style={{ fontSize: 20, marginBottom: 24 }}>Acceso de instructor</h1>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <p className="small danger" style={{ marginTop: 8 }}>{error}</p>}
          <div className="nav" style={{ marginTop: 20 }}>
            <button onClick={login} disabled={logging || !password}>
              {logging ? 'Verificando…' : 'Entrar'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );

  // ── Panel ──
  return (
    <main className="page">
      <section className="shell">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Header />
          <button className="btn secondary" style={{ fontSize: 10, marginTop: 2 }} onClick={logout}>
            Cerrar sesión
          </button>
        </div>

        <h1 className="headline" style={{ fontSize: 28, marginBottom: 4 }}>Clientes</h1>
        <p className="muted small" style={{ marginBottom: 32 }}>
          Selecciona un cliente para administrar su programa
        </p>

        <div className="grid">
          {clientes.map(c => (
            <div key={c.id} className="card" style={{ margin: 0 }}>
              <p className="brand" style={{ marginBottom: 12 }}>Programa activo</p>
              <h2 className="headline" style={{ fontSize: 26, marginBottom: 10 }}>{c.name}</h2>
              <p className="small muted" style={{ marginBottom: 20 }}>/{c.slug}</p>
              <div className="nav" style={{ marginTop: 0 }}>
                <a className="btn" href={`/admin/${c.slug}`}>Misiones</a>
                <a className="btn secondary" href="/evaluacion/admin">Evaluación</a>
              </div>
            </div>
          ))}

          <div className="card" style={{ margin: 0 }}>
            <p className="brand" style={{ marginBottom: 14 }}>Nuevo cliente</p>
            <Field label="Nombre de la empresa">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: SISU, Google, Banamex"
                onKeyDown={e => e.key === 'Enter' && saveCliente()}
              />
            </Field>
            <div className="nav" style={{ marginTop: 8 }}>
              <button onClick={saveCliente} disabled={saving || !name.trim()}>
                {saving ? 'Creando…' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
