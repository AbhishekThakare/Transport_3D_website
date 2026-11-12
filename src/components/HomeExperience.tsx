'use client';
import Link from 'next/link';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { KrlScene } from '@/scene/krlScene';

/* ---------- static network-map data (precomputed like the design's renderVals) ---------- */
const HQ = [1000, 443];
const RAW: [string, number, number, string?][] = [
  ['LUDHIANA', 1084, 239], ['DELHI', 1119, 298, 'r'], ['JAIPUR', 1083, 343], ['GUWAHATI', 1496, 363, 'u'],
  ['MUNDRA', 924, 449, 'l'], ['JAMSHEDPUR', 1353, 449, 'u'], ['KOLKATA', 1410, 454, 'd'], ['NAGPUR', 1169, 493, 'u'],
  ['RAIPUR', 1234, 490], ['MUMBAI', 1007, 545, 'l'], ['PUNE', 1033, 561], ['VIZAG', 1278, 582],
  ['HYDERABAD', 1153, 590], ['BENGALURU', 1130, 705, 'l'], ['CHENNAI', 1200, 701], ['KOCHI', 1096, 785],
];
const N = RAW.length;
const ROUTES = RAW.map(([, x, y], i) => {
  const dx = x - HQ[0], dy = y - HQ[1];
  return { len: +Math.hypot(dx, dy).toFixed(1), ang: +(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), d: +(i / (N - 1)).toFixed(3) };
});
const CITIES = RAW.map(([name, x, y, pos], i) => ({
  name, x, y, d: +(i / (N - 1)).toFixed(3),
  tx: pos === 'l' ? 'calc(-100% - 12px)' : pos === 'u' || pos === 'd' ? '-50%' : '12px',
  ty: pos === 'u' ? 'calc(-100% - 10px)' : pos === 'd' ? '10px' : '-50%',
}));

const CHAPTERS = [
  ['01 / WEIGHMENT', 'Weighed before we roll.', 'Every load starts on a calibrated weighbridge. Tare, gross and net — logged and shared with you before departure.'],
  ['02 / LOADING', 'Steel, placed with precision.', 'Rod bundles, coils and structurals crane-loaded and balanced across a 40 ft platform trailer.'],
  ['03 / SECURING', 'Strapped. Checked. Checked again.', 'Load-securing to transport norms, inspected by driver and supervisor before the gate opens.'],
  ['04 / TRANSIT', 'Through the night, on schedule.', 'Long-haul runs across the national highway network, driven by crews who know heavy loads.'],
  ['05 / NETWORK', 'Ahmedabad hub. Every state.', 'From our Gujarat base we dispatch across India — north to Punjab, east to Assam, south to Kerala.'],
  ['06 / CONTAINERS', 'Port to plant, container ready.', "20 ft and 40 ft container haulage from Gujarat's ports to inland depots and factories."],
  ['07 / GATE IN', 'On site. On schedule.', 'Gate pass checked, documents verified, escorted to the unloading bay.'],
  ['08 / SITE UNLOADING', 'On site. Unloaded safely.', 'Steel delivered straight to the residential site: wheels chocked, exclusion zone set, tag lines on every tower-crane lift, directed by a trained banksman.'],
];
const RAIL = ['01 WEIGH', '02 LOAD', '03 SECURE', '04 TRANSIT', '05 NETWORK', '06 PORT', '07 GATE IN', '08 UNLOAD'];
const CH_RANGES: [number, number][] = [[0.036, 0.16], [0.16, 0.40], [0.40, 0.475], [0.475, 0.615], [0.615, 0.755], [0.755, 0.885], [0.885, 0.92], [0.92, 1.5]];

const SERVICES = [
  ['S—01', 'Steel & heavy cargo', 'TMT bars, coils, plates and structurals moved plant-to-site with the right trailer for the weight.', 'BARS · COILS · PLATES · BEAMS'],
  ['S—02', 'Flatbed / platform trailers', "Open-body platform trailers for long, wide and awkward loads that won't fit in a box.", '32 FT · 40 FT · MULTI-AXLE'],
  ['S—03', 'Container haulage', 'Import and export boxes between port, ICD and factory, with turnaround planned around vessel cut-offs.', '20 FT · 40 FT · PORT ↔ PLANT'],
  ['S—04', 'Pan-India long haul', 'Full-truckload runs from Gujarat to every state, with updates from dispatch to delivery.', 'AHMEDABAD → ALL INDIA'],
];

const MARQUEE = ['Steel', 'Flatbed', 'Containers', 'Pan-India', 'Steel', 'Flatbed', 'Containers', 'Pan-India'];

export default function HomeExperience() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const kgRef = useRef<HTMLDivElement>(null);
  const kmRef = useRef<HTMLSpanElement>(null);
  const unlRef = useRef<HTMLSpanElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const mq = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scene: KrlScene | null = null;
    let disposed = false;
    let loaded = false;
    let raf = 0;
    const cache: Record<string, string> = {};

    import('@/scene/krlScene').then(({ createKrlScene }) => {
      if (disposed || !host.current) return;
      try {
        scene = createKrlScene(host.current);
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __krl: unknown }).__krl = scene;
      }
      catch (e) { console.error('krl-scene', e); if (loader.current) loader.current.textContent = '3D SCENE UNAVAILABLE ON THIS DEVICE'; }
    });

    const cl = (x: number) => Math.min(1, Math.max(0, x));

    const update = () => {
      const tr = track.current, st = stage.current;
      if (!tr || !st) return;
      const vw = window.innerWidth, vh = st.clientHeight || window.innerHeight;
      const r = tr.getBoundingClientRect();
      const rawP = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      const sc = scene;
      if (sc) { sc.setProgress(rawP); sc.paused = r.bottom < -50 || r.top > window.innerHeight + 50; }
      const hud = sc ? sc.hud : null;
      const p = hud && hud.ready ? hud.p : rawP;
      const seg = (a: number, b: number) => cl((p - a) / (b - a));
      const S: Record<string, number | string> = {};
      const mobile = vw < 820;
      let k = Math.min(vw / 1600, vh / 900);
      if (mobile) k = Math.max(k, vw / 1050);
      S['--k'] = k;
      S['--wx'] = (vw / 2 - 800 * k) + 'px';
      S['--wy'] = (vh / 2 - 470 * k + (mobile ? vh * 0.12 : 0)) + 'px';
      S['--p'] = p;
      S['--hero'] = 1 - seg(0.004, 0.026);
      const c: number[] = [];
      CH_RANGES.forEach(([a, b], i) => { c[i] = Math.min(seg(a, a + 0.012), 1 - seg(b - 0.012, b)); S['--c' + (i + 1)] = c[i]; });
      S['--hudKg'] = Math.max(c[0], c[1], c[2] * (1 - seg(0.44, 0.46)));
      S['--hudKm'] = c[3];
      S['--hudSafe'] = c[7] || 0;
      if (hud && hud.ready) {
        const su = hud.setup || 0, un = hud.unloaded || 0;
        [0.15, 0.4, 0.65, 0.9].forEach((t, i) => { S['--k' + (i + 1)] = su >= t ? 1 : 0.28; });
        if (unlRef.current) unlRef.current.textContent = un + ' / 3';
      }
      S['--map'] = Math.min(seg(0.615, 0.64), 1 - seg(0.74, 0.755));
      S['--route'] = seg(0.635, 0.73);
      if (hud) {
        S['--fade'] = hud.fade || 0;
        if (kgRef.current) kgRef.current.textContent = (hud.kg || 0).toLocaleString('en-IN');
        if (kmRef.current) kmRef.current.textContent = String(hud.km || 0);
        if (!loaded && loader.current) loader.current.style.setProperty('--load', String(hud.ready ? 1 : (hud.progress || 0) * 0.95));
        if (hud.ready && loader.current && !loaded) { loaded = true; loader.current.style.opacity = '0'; }
      }
      for (const key in S) {
        const v = typeof S[key] === 'number' ? String(Math.round((S[key] as number) * 10000) / 10000) : String(S[key]);
        if (cache[key] !== v) { cache[key] = v; st.style.setProperty(key, v); }
      }
      const m = mq.current;
      if (m) {
        const mr = m.getBoundingClientRect();
        if (mr.top < window.innerHeight + 200 && mr.bottom > -200) m.style.transform = 'translateX(' + ((mr.top - window.innerHeight) * 0.6 - 100) + 'px)';
      }
    };

    const loop = () => { raf = requestAnimationFrame(loop); update(); };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (scene) scene.dispose();
    };
  }, []);

  const v = (name: string, d = 0) => `var(${name},${d})`;

  return (
    <>
      <div ref={track} className="track">
        <div ref={stage} className="stage">
          <div ref={host} className="scene-host" />
          <div className="layer vignette" />
          <div className="layer side-shade" />
          <div className="layer fade" />

          {/* network map */}
          <div className="layer map">
            <div className="map-world">
              <div className="map-inner">
                <div className="map-frame" />
                <div className="map-title">KRL NETWORK · LIVE DISPATCH</div>
                {ROUTES.map((r, i) => (
                  <div key={'r' + i} className="route" style={{ width: r.len, transform: `rotate(${r.ang}deg) scaleX(clamp(0, calc(var(--route,0) * 2 - ${r.d}), 1))` }} />
                ))}
                {CITIES.map(c => (
                  <div key={c.name} className="city" style={{ left: c.x, top: c.y, opacity: `clamp(0, calc((var(--route,0) * 2 - ${c.d} - .8) * 5), 1)` } as CSSProperties}>
                    <div className="city-dot" />
                    <div className="city-name" style={{ transform: `translate(${c.tx},${c.ty})` }}>{c.name}</div>
                  </div>
                ))}
                <div className="hq-ring" />
                <div className="hq-dot" />
                <div className="hq-label">AHMEDABAD · HQ</div>
              </div>
            </div>
          </div>

          {/* HUD */}
          <div className="hud">
            <div className="hud-card" style={{ opacity: v('--hudKg'), minWidth: 200 } as CSSProperties}>
              <div className="hud-label">WEIGHBRIDGE · GROSS KG</div>
              <div ref={kgRef} className="hud-value">0</div>
            </div>
            <div className="hud-card" style={{ opacity: v('--hudKm'), minWidth: 220 } as CSSProperties}>
              <div className="hud-label">GPS · NH-48 · AHMEDABAD → MUMBAI</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span ref={kmRef} className="hud-value" style={{ marginTop: 0 }}>0</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/ 524 KM</span>
              </div>
            </div>
            <div className="hud-card hud-safe" style={{ opacity: v('--hudSafe') } as CSSProperties}>
              <div className="hud-label" style={{ marginBottom: 2 }}>SITE SAFETY CHECKLIST</div>
              {['WHEEL CHOCKS IN', 'EXCLUSION ZONE SET', 'PPE · BANKSMAN READY', 'STRAPS RELEASED'].map((t, i) => (
                <div key={t} className="row" style={{ opacity: `var(--k${i + 1},.28)` } as CSSProperties}><span>✓</span>{t}</div>
              ))}
              <div className="total"><span style={{ color: 'var(--muted)' }}>BUNDLES UNLOADED</span><span ref={unlRef} style={{ color: 'var(--orange)', fontWeight: 700 }}>0 / 3</span></div>
            </div>
          </div>

          <div ref={loader} className="loader"><span>LOADING 3D SCENE…</span><div className="loader-bar"><i /></div></div>
          <div className="layer hero-shade" />

          {/* hero */}
          <div className="live-badge"><i />FLEET ON THE ROAD · NH-48 · DUSK RUN</div>
          <div className="hero">
            <div className="eyebrow">AHMEDABAD, GUJARAT · PAN-INDIA HEAVY TRANSPORT</div>
            <h1>We move the steel that builds India.</h1>
            <p>Krishna Roadlines runs flatbed, platform and container haulage from Gujarat to every state — weighed, loaded, secured and delivered.</p>
            <div className="hero-actions">
              <Link href="/contact" className="btn btn-primary">GET A QUOTE →</Link>
              <Link href="/about" className="btn btn-ghost">ABOUT US</Link>
            </div>
          </div>
          <div className="scroll-cue">SCROLL TO LOAD THE TRUCK<i /></div>

          {/* chapters */}
          <div className="chapters">
            {CHAPTERS.map(([eb, h, p], i) => (
              <div key={eb} className="chapter" style={{ opacity: v(`--c${i + 1}`), transform: `translateY(calc((1 - var(--c${i + 1},0)) * 24px))` } as CSSProperties}>
                <div className="eyebrow">{eb}</div>
                <h2>{h}</h2>
                <p>{p}</p>
              </div>
            ))}
          </div>

          {/* progress rail */}
          <div className="rail">
            <div className="rail-bar"><i /></div>
            <div className="rail-labels">
              {RAIL.map((t, i) => <div key={t} style={{ opacity: `calc(.35 + var(--c${i + 1},0) * .65)` }}>{t}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="marquee">
        <div ref={mq} className="marquee-row">
          {MARQUEE.map((w, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <span className="gem">◆</span>}
              <span className={i % 2 ? 'outline' : undefined}>{w}</span>
            </span>
          ))}
        </div>
      </div>

      <section className="services">
        <div className="section-head">
          <div>
            <div className="eyebrow">WHAT WE HAUL</div>
            <h2>Four services. One dispatch desk.</h2>
          </div>
          <p>One call to our Ahmedabad office covers vehicle, loading, paperwork and delivery — wherever the load is going.</p>
        </div>
        <div className="svc-grid">
          {SERVICES.map(([n, h, p, t]) => (
            <div key={n} className="svc">
              <div className="svc-num">{n}</div>
              <h3>{h}</h3>
              <p>{p}</p>
              <div className="svc-tags">{t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-wrap">
        <div className="cta">
          <h2 style={{ maxWidth: '11ch' }}>Have a load to move?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
            <p>Tell us the route, cargo and weight. We&apos;ll come back with a vehicle and a rate.</p>
            <Link href="/contact" className="btn btn-dark">REQUEST A QUOTE →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
