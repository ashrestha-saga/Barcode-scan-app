export default function OfflinePage() {
  return (
    <div className="so-app">
      <div className="so-auth on">
        <div className="so-auth-in">
          <div className="so-brand">
            <strong>med-sales ScanOrder</strong>
            <span>Scan-to-Order</span>
          </div>
          <h3>Keine Verbindung</h3>
          <p className="so-lead">
            Die App-Oberfläche bleibt verfügbar. Anmeldung und Artikeldaten
            brauchen eine Verbindung zum Shop.
          </p>
          <a className="so-cta so-cta--block" href="/">
            Erneut versuchen
          </a>
        </div>
      </div>
    </div>
  );
}
