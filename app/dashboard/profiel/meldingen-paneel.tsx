"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { bewaarPushAbonnementAction, stuurTestPushAction, verwijderPushAbonnementAction } from "@/app/lib/actions/push";

type Stand = "laden" | "niet-ondersteund" | "installeren" | "geweigerd" | "uit" | "aan";

function base64NaarBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const ruw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(ruw.length));
  for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i);
  return bytes;
}

const PUBLIEKE_SLEUTEL = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// Meldingen bij een nieuwe aanvraag. Vraagt nooit zelf om toestemming: pas als
// je op de knop tikt. Op iPhone werkt het alleen met iOS 16.4 of nieuwer, als
// Kostenplan op het beginscherm staat.
export function MeldingenPaneel() {
  const [stand, setStand] = useState<Stand>("laden");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    let weg = false;
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      let uit: Stand;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        uit = ios && !standalone ? "installeren" : "niet-ondersteund";
      } else if (Notification.permission === "denied") uit = "geweigerd";
      else {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/");
          const sub = await reg?.pushManager.getSubscription();
          uit = sub ? "aan" : "uit";
        } catch {
          uit = "uit";
        }
      }
      if (!weg) setStand(uit);
    })();
    return () => {
      weg = true;
    };
  }, []);

  async function zetAan() {
    setBezig(true);
    setMelding(null);
    try {
      const toestemming = await Notification.requestPermission();
      if (toestemming !== "granted") {
        setStand(toestemming === "denied" ? "geweigerd" : "uit");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64NaarBytes(PUBLIEKE_SLEUTEL) });
      const json = sub.toJSON();
      const r = await bewaarPushAbonnementAction({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
      if (r.ok) setStand("aan");
      else setMelding(r.error);
    } catch {
      setMelding("Meldingen aanzetten is niet gelukt. Probeer het later nog eens.");
    } finally {
      setBezig(false);
    }
  }

  async function zetUit() {
    setBezig(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await verwijderPushAbonnementAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStand("uit");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <p className="text-base text-foreground">Krijg een melding op dit toestel zodra er een nieuwe aanvraag binnenkomt.</p>

      {stand === "laden" && <p className="text-sm text-muted-foreground">Even kijken…</p>}
      {stand === "installeren" && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          Op een iPhone werkt dit met iOS 16.4 of nieuwer, en alleen als Kostenplan op je beginscherm staat. Tik onderin op Delen, kies Zet op beginscherm en open Kostenplan daarna vanaf je beginscherm.
        </p>
      )}
      {stand === "niet-ondersteund" && <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">Deze browser kan geen meldingen tonen. Probeer Chrome op je telefoon.</p>}
      {stand === "geweigerd" && <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">Meldingen zijn geblokkeerd. Zet ze aan in de instellingen van je browser of telefoon en kom dan terug.</p>}
      {stand === "uit" && (
        <Button type="button" size="lg" disabled={bezig} onClick={() => void zetAan()} className="w-full">
          <Bell className="h-5 w-5" aria-hidden="true" /> {bezig ? "Bezig…" : "Meldingen aanzetten"}
        </Button>
      )}
      {stand === "aan" && (
        <div className="flex flex-col gap-3">
          <p role="status" className="rounded-xl bg-accent p-4 text-sm font-medium text-foreground">Meldingen staan aan op dit toestel.</p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={async () => {
              const r = await stuurTestPushAction();
              setMelding(r.ok ? "Testmelding verstuurd." : "Testmelding versturen lukte niet.");
            }}
          >
            Stuur een testmelding
          </Button>
          <Button type="button" variant="ghost" size="lg" disabled={bezig} onClick={() => void zetUit()}>
            <BellOff className="h-5 w-5" aria-hidden="true" /> Meldingen uitzetten
          </Button>
        </div>
      )}
      {melding && (
        <p role="status" className="text-sm text-foreground">
          {melding}
        </p>
      )}
    </section>
  );
}
