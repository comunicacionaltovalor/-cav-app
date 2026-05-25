import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="page dark" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <section className="shell">
        <Header />
        <div className="card" style={{ maxWidth: 580 }}>
          <p className="brand" style={{ marginBottom: 22 }}>Sistema operativo de presencia ejecutiva</p>
          <h1
            className="headline"
            style={{ fontSize: 'clamp(26px, 5vw, 36px)', marginBottom: 18 }}
          >
            El silencio también comunica.
          </h1>
          <p style={{ lineHeight: 1.75, marginBottom: 30, fontSize: 16, opacity: .82 }}>
            Plataforma diaria de misiones, observación y evidencia para profesionales
            de Comunicación Alto Valor.
          </p>
          <div className="nav" style={{ marginTop: 0 }}>
            <a className="btn" href="/admin">Panel de administración</a>
          </div>
        </div>
      </section>
    </main>
  );
}
