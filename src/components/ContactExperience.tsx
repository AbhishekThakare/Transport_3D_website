'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';

const CARGO = ['STEEL', 'MACHINERY', 'CONTAINER', 'OTHER'];
const VEHICLES = ['Not sure — advise me', '40 ft platform trailer', '32 ft flatbed', '20 ft container trailer', '40 ft container trailer'];

export default function ContactExperience() {
  const truck = useRef<HTMLDivElement>(null);
  const [cargo, setCargo] = useState('STEEL');
  const [sent, setSent] = useState(false);
  const [sentName, setSentName] = useState('');
  const [error, setError] = useState('');
  const [bad, setBad] = useState<{ name?: boolean; phone?: boolean }>({});

  useEffect(() => {
    const t0 = performance.now();
    let raf = 0, introRaf = 0;
    const update = () => {
      const el = truck.current; if (!el) return;
      const vw = window.innerWidth;
      let t = Math.min(1, (performance.now() - t0) / 1800);
      t = 1 - Math.pow(1 - t, 3);
      const base = -400 + (vw * 0.12 + 400) * t;
      const x = base + window.scrollY * 1.2;
      el.style.transform = 'translateX(' + Math.min(x, vw + 40) + 'px)';
    };
    const tick = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    const intro = () => { update(); if (performance.now() - t0 < 1900) introRaf = requestAnimationFrame(intro); };
    intro();
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
      cancelAnimationFrame(raf); cancelAnimationFrame(introRaf);
    };
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').replace(/[^0-9]/g, '');
    const b = { name: !name, phone: phone.length < 10 };
    if (b.name || b.phone) {
      setBad(b);
      setError(b.name && b.phone ? 'ADD YOUR NAME AND PHONE' : b.name ? 'ADD YOUR NAME' : 'ENTER A VALID PHONE NUMBER');
      return;
    }
    // TODO: send the request to your backend / email service here (fd + cargo).
    setSent(true); setSentName(name.split(' ')[0]); setError(''); setBad({});
  };
  const reset = () => { setSent(false); setError(''); setBad({}); };

  return (
    <>
      <header className="c-head">
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div className="eyebrow">CONTACT · DISPATCH DESK</div>
          <h1>Let&apos;s move<br />your load.</h1>
          <p>Send the route and cargo details. Our Ahmedabad office will call you back with a vehicle and a rate.</p>
        </div>
        <div className="c-road">
          <div className="edge" />
          <div className="dash" />
          <div ref={truck} className="c-truck" aria-hidden="true">
            <div style={{ left: 0, top: 44, width: 260, height: 10 }} />
            <div style={{ left: 20, top: 26, width: 200, height: 18, borderColor: 'var(--orange)', backgroundImage: 'repeating-linear-gradient(180deg,rgba(242,140,40,.85) 0 2px,transparent 2px 5px)' }} />
            <div style={{ left: 252, top: 20, width: 7, height: 26 }} />
            <div style={{ left: 262, top: 0, width: 56, height: 58, borderRadius: '3px 10px 2px 2px' }} />
            <div style={{ left: 292, top: 6, width: 20, height: 20, borderColor: 'var(--cyan)', background: 'rgba(60,198,214,.15)' }} />
            <div className="wheel" style={{ left: 30 }} />
            <div className="wheel" style={{ left: 58 }} />
            <div className="wheel" style={{ left: 230 }} />
            <div className="wheel" style={{ left: 290 }} />
          </div>
        </div>
      </header>

      <section id="quote" className="quote">
        <div className="q-card">
          {!sent ? (
            <form onSubmit={submit} noValidate className="q-form">
              <div className="q-title">
                <h2>Request a quote</h2>
                <span className="q-req">* REQUIRED</span>
              </div>
              <div className="q-grid">
                <label className={`field${bad.name ? ' bad' : ''}`}>NAME *<input name="name" placeholder="Your name" autoComplete="name" /></label>
                <label className="field">COMPANY<input name="company" placeholder="Company name" autoComplete="organization" /></label>
                <label className={`field${bad.phone ? ' bad' : ''}`}>PHONE *<input name="phone" type="tel" placeholder="+91" autoComplete="tel" /></label>
                <label className="field">EMAIL<input name="email" type="email" placeholder="you@company.com" autoComplete="email" /></label>
                <label className="field">PICKUP CITY<input name="from" placeholder="e.g. Ahmedabad" /></label>
                <label className="field">DROP CITY<input name="to" placeholder="e.g. Chennai" /></label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field" style={{ gap: 0 }}>CARGO TYPE</div>
                <div className="chips">
                  {CARGO.map(c => (
                    <button key={c} type="button" className={`chip${c === cargo ? ' on' : ''}`} aria-pressed={c === cargo} onClick={() => setCargo(c)}>{c}</button>
                  ))}
                </div>
                <input type="hidden" name="cargo" value={cargo} />
              </div>
              <div className="q-grid">
                <label className="field">APPROX. WEIGHT (TONNES)<input name="weight" inputMode="decimal" placeholder="e.g. 28" /></label>
                <label className="field">VEHICLE<select name="vehicle" defaultValue={VEHICLES[0]}>{VEHICLES.map(v => <option key={v}>{v}</option>)}</select></label>
              </div>
              <label className="field">DETAILS<textarea name="message" rows={3} placeholder="Dates, dimensions, loading/unloading notes" /></label>
              <div className="q-submit-row">
                <button type="submit" className="q-submit">SEND REQUEST →</button>
                <span className="q-error" role="alert">{error}</span>
              </div>
            </form>
          ) : (
            <div className="q-done">
              <div className="q-check">✓</div>
              <div className="eyebrow">REQUEST RECEIVED</div>
              <h2>Thanks, {sentName}. We&apos;re on it.</h2>
              <p>Our dispatch desk will call you back on the number you gave us with a vehicle and a rate.</p>
              <button type="button" className="q-again" onClick={reset}>SEND ANOTHER REQUEST</button>
            </div>
          )}
        </div>

        <div className="info">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="info-row"><div className="k">HEAD OFFICE</div><div className="v">[Street address]<br />Ahmedabad, Gujarat, India</div></div>
            <div className="info-row"><div className="k">PHONE</div><div className="v">[+91 phone number]</div></div>
            <div className="info-row"><div className="k">EMAIL</div><div className="v">[email address]</div></div>
            <div className="info-row"><div className="k">COVERAGE</div><div className="v">Pan-India · all states</div></div>
          </div>
          <div className="map-ph">
            <div className="placeholder">MAP — AHMEDABAD OFFICE LOCATION</div>
            <div className="map-pin" />
          </div>
        </div>
      </section>
    </>
  );
}
