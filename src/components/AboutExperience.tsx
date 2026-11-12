'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

const STEPS = [
  ['01', 'Enquiry & quote', 'Route, cargo, weight, dates. You get a clear rate and a vehicle recommendation.'],
  ['02', 'Vehicle allotment', 'The right trailer for the load — platform, flatbed or container chassis — with driver details shared in advance.'],
  ['03', 'Loading & weighment', 'Supervised loading, securing and a weighbridge slip before the truck leaves the yard.'],
  ['04', 'Tracked transit', 'Regular location updates from our dispatch desk until the truck reaches site.'],
  ['05', 'Delivery & POD', 'Unloading at site and signed proof of delivery returned to you.'],
];

const VALUES = [
  ['Safety first', 'Correct securing, correct axle loads, no shortcuts. Heavy cargo leaves no room for them.'],
  ['On schedule', 'Your site, plant or vessel runs on a timetable. We plan the run around it.'],
  ['Straight talk', 'Clear rates, clear paperwork, and a phone that gets answered when you need an update.'],
];

export default function AboutExperience() {
  const par = useRef<HTMLDivElement>(null);
  const proc = useRef<HTMLElement>(null);
  const tl = useRef<HTMLDivElement>(null);
  const truck = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const stepLabel = useRef<HTMLDivElement>(null);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let lastActive = -1;
    const update = () => {
      const vh = window.innerHeight;
      const pe = par.current;
      if (pe && pe.parentElement) {
        const r = pe.parentElement.getBoundingClientRect();
        const t = (r.top + r.height / 2 - vh / 2) / vh;
        pe.style.transform = 'translateY(' + (t * -12) + '%)';
      }
      const sec = proc.current, tle = tl.current, tr = truck.current;
      if (!sec || !tle || !tr) return;
      const r = sec.getBoundingClientRect();
      const svh = (sec.firstElementChild as HTMLElement | null)?.offsetHeight || vh;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - svh)));
      const els = steps.current.filter(Boolean) as HTMLDivElement[];
      const tlTop = tle.getBoundingClientRect().top;
      const centers = els.map(s => { const b = s.getBoundingClientRect(); return b.top - tlTop + b.height / 2; });
      const maxY = tle.offsetHeight - 92;
      const seg = p * (centers.length - 1);
      const i0 = Math.min(centers.length - 2, Math.floor(seg)), f = seg - i0;
      const ez = f * f * (3 - 2 * f);
      const y = Math.min(maxY, Math.max(0, (centers[i0] + (centers[i0 + 1] - centers[i0]) * ez) - 46));
      tr.style.transform = 'translateY(' + y + 'px)';
      if (lane.current) lane.current.style.backgroundPositionY = (-p * 600) + 'px';
      const active = Math.round(seg);
      if (active !== lastActive) {
        lastActive = active;
        els.forEach((s, i) => {
          s.style.opacity = String(i <= active ? (i === active ? 1 : 0.55) : 0.25);
          s.classList.toggle('active', i === active);
        });
        if (stepLabel.current) stepLabel.current.textContent = 'STOP 0' + (active + 1) + ' / 05';
      }
    };
    // continuous loop keeps the truck glued to its stop while step heights animate on mobile
    const loop = () => { raf = requestAnimationFrame(loop); update(); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">ABOUT KRISHNA ROADLINES</div>
        <h1>Built in Ahmedabad. <span className="outline">Trusted across India.</span></h1>
      </header>

      <div className="container">
        <div className="photo">
          <div ref={par} className="photo-par">
            <div className="placeholder">FLEET / YARD PHOTO — DROP IMAGE HERE</div>
          </div>
          <div className="photo-tag">AHMEDABAD YARD · GUJARAT</div>
        </div>
      </div>

      <section className="who">
        <div>
          <div className="eyebrow">WHO WE ARE</div>
          <h2>Heavy, long and awkward is our everyday.</h2>
        </div>
        <div className="who-copy">
          <p>Krishna Roadlines is an Ahmedabad-based transport company built around the loads other carriers avoid — steel, structurals, machinery and containers — moved on flatbed and platform trailers to every corner of India.</p>
          <p>We run it like a dispatch desk, not a booking counter: one point of contact who plans the vehicle, supervises loading and weighment, tracks the run and doesn&apos;t close the job until your proof of delivery is back.</p>
        </div>
      </section>

      <section ref={proc} className="proc">
        <div className="proc-sticky">
          <div className="proc-head">
            <div>
              <div className="eyebrow">HOW A LOAD MOVES</div>
              <h2>Five stops, no surprises.</h2>
            </div>
            <div ref={stepLabel} className="step-label">STOP 01 / 05</div>
          </div>
          <div ref={tl} className="tl">
            <div className="tl-road" />
            <div ref={lane} className="tl-lane" />
            <div ref={truck} className="tl-truck"><div className="bed" /><div className="cab" /></div>
            {STEPS.map(([n, h, p], i) => (
              <div key={n} ref={el => { steps.current[i] = el; }} className="step">
                <div className="step-num">{n}</div>
                <div><h3>{h}</h3><p>{p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="values">
        <div className="eyebrow">WHAT WE STAND ON</div>
        <div className="values-grid">
          {VALUES.map(([h, p]) => (
            <div key={h} className="value">
              <div className="gem" />
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-wrap">
        <div className="cta">
          <h2 style={{ maxWidth: '12ch' }}>Let&apos;s plan your next run.</h2>
          <Link href="/contact" className="btn btn-dark">CONTACT US →</Link>
        </div>
      </section>
    </>
  );
}
