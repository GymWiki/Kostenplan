"use client";

import { useEffect, useRef, useState } from "react";

const A4_PX = 793.7; // 210 mm bij 96 dpi

// Toont het A4-document op ware verhouding, verkleind tot de beschikbare breedte
// (nooit groter dan 100%). De verkleining gebeurt met transform, zodat de indeling
// identiek blijft aan de PDF.
export function VelSchaal({ children, max = 1, marge = 0 }: { children: React.ReactNode; max?: number; marge?: number }) {
  const buiten = useRef<HTMLDivElement>(null);
  const binnen = useRef<HTMLDivElement>(null);
  const [schaal, setSchaal] = useState(max);
  const [hoogte, setHoogte] = useState<number | undefined>(undefined);

  useEffect(() => {
    const b = buiten.current;
    const i = binnen.current;
    if (!b || !i) return;
    const meet = () => {
      const s = Math.min(max, Math.max(0.3, (b.clientWidth - marge) / A4_PX));
      setSchaal(s);
      setHoogte(i.offsetHeight * s);
    };
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(b);
    ro.observe(i);
    return () => ro.disconnect();
  }, [max, marge]);

  return (
    <div ref={buiten} className="w-full">
      <div style={{ width: A4_PX * schaal, height: hoogte, margin: "0 auto" }}>
        <div ref={binnen} style={{ width: "210mm", transform: `scale(${schaal})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
