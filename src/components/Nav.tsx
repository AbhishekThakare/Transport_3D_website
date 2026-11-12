'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onResize = () => { if (window.innerWidth > 760) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [open]);

  const cls = (href: string) => (path === href ? 'active' : undefined);
  const quoteHref = path === '/contact' ? '#quote' : '/contact';
  const close = () => setOpen(false);

  return (
    <nav className={`nav${open ? ' open' : ''}`}>
      <Link href="/" className="brand" onClick={close}>
        <img src="/assets/logo-mark-light.png" alt="Krishna Roadlines logo" />
        <span>KRISHNA ROADLINES</span>
      </Link>
      <button className="nav-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <i /><i /><i />
      </button>
      <div className="nav-links">
        <Link href="/" className={cls('/')} onClick={close}>HOME</Link>
        <Link href="/about" className={cls('/about')} onClick={close}>ABOUT</Link>
        <Link href="/contact" className={cls('/contact')} onClick={close}>CONTACT</Link>
        <Link href={quoteHref} className="nav-cta" onClick={close}>GET A QUOTE</Link>
      </div>
    </nav>
  );
}
