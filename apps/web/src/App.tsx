const docs = [
  { label: 'Architecture', href: 'https://github.com/AINYC/aeo-audit/blob/main/docs/architecture.md' },
  { label: 'Testing Guide', href: 'https://github.com/AINYC/aeo-audit/blob/main/docs/testing.md' },
  { label: 'Self-Hosting', href: 'https://github.com/AINYC/aeo-audit/blob/main/docs/self-hosting.md' },
]

export function App() {
  return (
    <main className="shell">
      <div className="eyebrow">AINYC</div>
      <h1>Platform skeleton</h1>
      <p className="lede">
        The current root package remains the published AEO audit engine. This web app is the Phase 1
        placeholder for the self-hosted monitoring platform.
      </p>

      <section className="card">
        <h2>Project</h2>
        <p>@ainyc/aeo-audit platform scaffold</p>
      </section>

      <section className="card">
        <h2>Status</h2>
        <p>API status unknown</p>
        <p>Worker status unknown</p>
      </section>

      <section className="card">
        <h2>Docs</h2>
        <ul>
          {docs.map((doc) => (
            <li key={doc.href}>
              <a href={doc.href} target="_blank" rel="noreferrer">
                {doc.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
