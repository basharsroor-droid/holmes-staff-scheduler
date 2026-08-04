import { DISCLAIMER } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-title">GoldSignal AI</p>
          <p className="footer-copy">
            Trusted-source gold intelligence, transparent signal logic, and API-ready architecture for real market integrations.
          </p>
        </div>
        <div>
          <p className="footer-title">Disclosure</p>
          <p className="footer-copy">{DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
