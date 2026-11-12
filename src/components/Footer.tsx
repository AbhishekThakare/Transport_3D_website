import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <img src="/assets/logo-full-light.png" alt="Krishna Roadlines" />
      <div>AHMEDABAD, GUJARAT, INDIA · PAN-INDIA SERVICE</div>
      <div className="footer-links">
        <Link href="/">HOME</Link>
        <Link href="/about">ABOUT</Link>
        <Link href="/contact">CONTACT</Link>
      </div>
      <div>© 2026 KRISHNA ROADLINES</div>
    </footer>
  );
}
