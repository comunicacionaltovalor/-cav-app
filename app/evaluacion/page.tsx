'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function EvaluacionLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eval_auth');
      if (raw) {
        const { ts, role } = JSON.parse(raw);
        if (Date.now() - ts < 8 * 60 * 60 * 1000) {
          window.location.href = role === 'rrhh' ? '/evaluacion/rrhh' : '/evaluacion/admin';
        }
      }
    } catch { /* ignorar */ }
  }, []);

  async function login() {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/evaluacion/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        const { role } = await res.json();
        localStorage.setItem('eval_auth', JSON.stringify({ ts: Date.now(), role }));
        window.location.href = role === 'rrhh' ? '/evaluacion/rrhh' : '/evaluacion/admin';
      } else {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <main className="page dark" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <section className="shell" style={{ maxWidth: 460, margin: '0 auto' }}>
        <Header />
        <div className="card">
          <p className="brand" style={{ marginBottom: 14 }}>Módulo de evaluación</p>
          <h1 className="headline" style={{ fontSize: 20, marginBottom: 8 }}>Acceso</h1>
          <p style={{ fontSize: 13, opacity: .6, marginBottom: 26, lineHeight: 1.75, fontFamily: 'Georgia, serif' }}>
            Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
          </p>

          <div className="field">
            <label>Usuario <span style={{ opacity: .45, fontSize: 10 }}>(solo RRHH)</span></label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Deja vacío si eres instructor"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="small danger" style={{ marginTop: 10 }}>{error}</p>}

          <div className="nav" style={{ marginTop: 22 }}>
            <button onClick={login} disabled={loading || !password}>
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
