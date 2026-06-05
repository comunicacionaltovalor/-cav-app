'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function EvaluacionLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eval_auth');
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < 8 * 60 * 60 * 1000) {
          window.location.href = '/evaluacion/admin';
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
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem('eval_auth', JSON.stringify({ ts: Date.now() }));
        window.location.href = '/evaluacion/admin';
      } else {
        setError('Contraseña incorrecta.');
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
          <h1 className="headline" style={{ fontSize: 20, marginBottom: 8 }}>
            Acceso de instructor
          </h1>
          <p style={{ fontSize: 13, opacity: .6, marginBottom: 26, lineHeight: 1.75, fontFamily: 'Georgia, serif' }}>
            Técnicas de Actuación para Comunicar con Claridad, Seguridad y Credibilidad
          </p>
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
          {error && (
            <p className="small danger" style={{ marginTop: 10 }}>{error}</p>
          )}
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
