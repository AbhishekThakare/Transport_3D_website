'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/** Inertial smooth scrolling (mouse wheel / trackpad). Touch keeps native scrolling. */
export default function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const path = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -60 }, autoRaf: true });
    lenis.current = l;
    return () => { l.destroy(); lenis.current = null; };
  }, []);

  // new page -> start at the top
  useEffect(() => { lenis.current?.scrollTo(0, { immediate: true }); }, [path]);

  return null;
}
