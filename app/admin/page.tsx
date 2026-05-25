'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Field } from '@/components/Input';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

type Cliente = { id: string; name: string; slug: string; created_at: string };

export default function AdminHome() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [name, setName]         = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

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

  return (
    <main className="page">
      <section className="shell">
        <Header />

        <h1 className="headline" style={{ fontSize: 28, marginBottom: 4 }}>Clientes</h1>
        <p className="muted small" style={{ marginBottom: 32 }}>
          Selecciona un cliente para administrar su programa
        </p>

        <div className="grid">
          {clientes.map(c => (
            <a key={c.id} href={`/admin/${c.slug}`} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{
                  margin: 0,
                  cursor: 'pointer',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--oro)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(27,42,74,.16)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <p className="brand" style={{ marginBottom: 12 }}>Programa activo</p>
                <h2 className="headline" style={{ fontSize: 26, marginBottom: 10 }}>{c.name}</h2>
                <p className="small muted">/{c.slug}</p>
              </div>
            </a>
          ))}

          {/* Tarjeta nuevo cliente */}
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
