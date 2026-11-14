"use client";

import { useEffect, useRef, useState } from "react";
import type { Car } from "@/lib/types";
import { CarPhoto, photoFor } from "./CarPhoto";
import { miles } from "./format";
import { Verdict, type CheckResult, type Pricing } from "./Verdict";

export type Sample = { id: string; year: number; make: string; model: string; mileage: number; note: string };
type GarageCar = Car & { isSample?: boolean };
type QuoteInput = { text: string } | { imageBase64: string; mediaType: string } | { sampleId: string };

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const MAX_PHOTO_BYTES = 5_000_000;
const field = "h-11 w-full rounded-control border border-line bg-inset px-3 text-sm text-ink placeholder:text-muted transition-colors hover:border-muted/50 focus:bg-surface";
const label = "mb-1 block text-xs font-medium text-body";

const ERRORS: Record<string, string> = {
  no_lines: "We could not read any priced lines in that quote. Try a clearer photo or paste the text.",
  not_found: "That car is no longer in your garage. Add it again.",
  invalid: "Something in the form is missing or out of range. Check the car details and the quote.",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "content-type": "application/json" } : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[data.error] ?? data.message ?? "Something went wrong on our side. Please try again.");
  return data as T;
}

export function Checker({ samples, pricing }: { samples: Sample[]; pricing: Pricing }) {
  const [cars, setCars] = useState<GarageCar[]>([]);
  const [carId, setCarId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ name: string; imageBase64: string; mediaType: string }>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ data: CheckResult; sample: boolean }>();
  const [checkout, setCheckout] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCheckout(new URLSearchParams(window.location.search).get("checkout")); }, []);

  useEffect(() => {
    api<GarageCar[]>("/api/cars")
      .then((list) => { setCars(list); setCarId(list[0]?.id); setAdding(list.length === 0); })
      .catch(() => setAdding(true));
  }, []);

  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [result]);

  const run = async (what: string, job: () => Promise<void>) => {
    setBusy(what); setError(undefined);
    try { await job(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  };

  const check = async (id: string | undefined, input: QuoteInput) => {
    const data = await api<CheckResult>("/api/quotes/check", { method: "POST", body: JSON.stringify({ carId: id, ...input }) });
    setResult({ data, sample: "sampleId" in input });
  };

  const addCar = async (car: Omit<Car, "id">) => {
    const saved = await api<GarageCar>("/api/cars", { method: "POST", body: JSON.stringify(car) });
    setCars((c) => [...c.filter((x) => x.id !== saved.id), saved]);
    setCarId(saved.id); setAdding(false);
    return saved;
  };

  // Without a carId the API checks a sample against the labeled sample car named on that quote.
  const runSample = (s: Sample) => run(`sample-${s.id}`, async () => {
    await check(undefined, { sampleId: s.id });
    const list = await api<GarageCar[]>("/api/cars");
    setCars(list); setAdding(false);
    setCarId(list.find((c) => c.year === s.year && c.make === s.make && c.model === s.model)?.id ?? list[0]?.id);
  });

  const loadDemo = () => run("demo", async () => {
    const { carIds } = await api<{ carIds: string[] }>("/api/demo", { method: "POST" });
    const list = await api<GarageCar[]>("/api/cars");
    setCars(list); setCarId(carIds[0] ?? list[0]?.id); setAdding(false);
  });

  const onPhoto = (file?: File) => {
    setError(undefined);
    if (!file) return setPhoto(undefined);
    if (file.size > MAX_PHOTO_BYTES) return setError("That photo is over 5 MB. Use a smaller one or paste the text.");
    const reader = new FileReader();
    reader.onload = () => setPhoto({ name: file.name, imageBase64: String(reader.result).split(",")[1], mediaType: file.type });
    reader.readAsDataURL(file);
  };

  const canCheck = !!carId && (!!text.trim() || !!photo) && !busy;
  const submit = () => carId && run("check", () => check(carId, photo ? { imageBase64: photo.imageBase64, mediaType: photo.mediaType } : { text }));

  return (
    <section id="check" className="mt-8 scroll-mt-20 rounded-card bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-xl font-semibold">Check a quote</h2>
      {checkout === "success" && (
        <p role="status" className="mt-3 rounded-control bg-ok-soft px-3 py-2 text-sm text-[#1c7a47]">Plus is active. Run a check to see the full report.</p>
      )}
      {(checkout === "failed" || checkout === "invalid") && (
        <p role="status" className="mt-3 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn-ink">Checkout did not complete, so you are still on the free plan.</p>
      )}

      <div className="mt-4 rounded-card bg-inset p-4">
        <p className="text-sm font-medium">No quote on hand? Try a sample.</p>
        <p className="mt-0.5 text-xs text-muted">Sample quotes written for the demo. They run through the same checks as yours.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {samples.map((s) => (
            <button key={s.id} type="button" disabled={!!busy} onClick={() => runSample(s)}
              className="rounded-control border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-ring disabled:opacity-60">
              <span className="block text-sm font-medium">{busy === `sample-${s.id}` ? "Checking, about 5 seconds…" : `${s.year} ${s.make} ${s.model}`}</span>
              <span className="mt-0.5 block text-xs text-body">{miles(s.mileage)} · {s.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">1. Your car</h3>
            {!adding && <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-accent-deep hover:underline">Add a car</button>}
          </div>
          {cars.length > 0 && (
            <div role="radiogroup" aria-label="Your cars" className="mt-2 grid gap-2">
              {cars.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={c.id === carId} onClick={() => setCarId(c.id)}
                  className={`flex min-h-16 items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors ${c.id === carId ? "border-ring bg-accent-soft" : "border-line bg-surface hover:border-muted/50"}`}>
                  {photoFor(c.model) && <span className="w-24 shrink-0"><CarPhoto model={c.model} alt="" sizes="96px" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.year} {c.make} {c.model}</span>
                    <span className="block text-xs text-body tabular-nums">{miles(c.mileage)} · {c.state}</span>
                  </span>
                  {c.isSample && <span className="shrink-0 rounded-full bg-inset px-2 py-0.5 text-xs text-body">Sample data</span>}
                </button>
              ))}
            </div>
          )}
          {adding && <CarForm busy={busy === "car"} onCancel={cars.length ? () => setAdding(false) : undefined}
            onSave={(car) => run("car", async () => { await addCar(car); })} onError={setError} />}
          {cars.every((c) => !c.isSample) && (
            <button type="button" disabled={!!busy} onClick={loadDemo} className="mt-3 text-sm font-medium text-accent-deep hover:underline disabled:opacity-60">
              {busy === "demo" ? "Loading sample garage…" : "Or load a sample garage (labeled sample data)"}
            </button>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold">2. The quote</h3>
          <label className={`${label} mt-2`} htmlFor="quote-text">Paste the quote text</label>
          <textarea id="quote-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} disabled={!!photo}
            placeholder={"Front brake pads ..... $229.00\nCoolant flush ........ $189.00"}
            className={`${field} h-auto py-2.5 leading-relaxed disabled:opacity-50`} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border border-line bg-inset px-3 text-sm font-medium transition-colors hover:border-muted/50 focus-within:outline-2 focus-within:outline-ring">
              <svg viewBox="0 0 20 20" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h1.6l1-1.5h5.8l1 1.5h1.6A1.5 1.5 0 0 1 17 7.5v7A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5z" /><circle cx="10" cy="11" r="2.75" />
              </svg>
              {photo ? "Change photo" : "Or add a photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {photo && (
              <span className="flex min-w-0 items-center gap-2 text-sm text-body">
                <span className="truncate">{photo.name}</span>
                <button type="button" onClick={() => setPhoto(undefined)} className="font-medium text-accent-deep hover:underline">Remove</button>
              </span>
            )}
          </div>
          <button type="button" disabled={!canCheck} onClick={submit}
            className="mt-4 h-11 w-full rounded-full bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-muted">
            {busy === "check" ? "Checking, about 5 seconds…" : "Check this quote"}
          </button>
          {!carId && <p className="mt-2 text-xs text-muted">Add your car first so prices and warranty match it.</p>}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn-ink">{error}</p>}
      <div ref={resultRef} className="scroll-mt-20">
        {result && <Verdict result={result.data} sample={result.sample} pricing={pricing} />}
      </div>
    </section>
  );
}

function CarForm({ busy, onSave, onCancel, onError }: {
  busy: boolean; onSave: (car: Omit<Car, "id">) => void; onCancel?: () => void; onError: (m?: string) => void;
}) {
  const [f, setF] = useState({ vin: "", year: "", make: "", model: "", mileage: "", state: "TX", originalOwner: true });
  const [decoded, setDecoded] = useState<Partial<Car>>({});
  const [decoding, setDecoding] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const decode = async () => {
    setDecoding(true); onError(undefined);
    try {
      const car = await api<Partial<Car>>(`/api/vin?vin=${encodeURIComponent(f.vin.trim())}`);
      setDecoded(car);
      setF((p) => ({ ...p, year: String(car.year ?? p.year), make: car.make ?? p.make, model: car.model ?? p.model }));
    } catch (e) { onError((e as Error).message); } finally { setDecoding(false); }
  };

  const vin = f.vin.trim();
  const ready = /^\d{4}$/.test(f.year) && f.make.trim() && f.model.trim() && /^\d+$/.test(f.mileage);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(vin.length === 17 ? { vin, trim: decoded.trim, drivetrain: decoded.drivetrain, fuel: decoded.fuel } : {}),
      year: Number(f.year), make: f.make.trim(), model: f.model.trim(), mileage: Number(f.mileage), state: f.state, originalOwner: f.originalOwner,
    });
  };

  return (
    <form onSubmit={save} className="mt-3 grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className={label} htmlFor="vin">VIN (optional, fills the rest)</label>
        <div className="flex gap-2">
          <input id="vin" value={f.vin} onChange={set("vin")} maxLength={17} autoComplete="off" spellCheck={false} placeholder="17 characters" className={`${field} uppercase`} />
          <button type="button" onClick={decode} disabled={vin.length !== 17 || decoding}
            className="h-11 shrink-0 rounded-control border border-line bg-inset px-4 text-sm font-medium transition-colors hover:border-muted/50 disabled:opacity-50">
            {decoding ? "Decoding…" : "Decode"}
          </button>
        </div>
      </div>
      <div><label className={label} htmlFor="year">Year</label><input id="year" inputMode="numeric" value={f.year} onChange={set("year")} placeholder="2019" className={field} /></div>
      <div><label className={label} htmlFor="make">Make</label><input id="make" value={f.make} onChange={set("make")} placeholder="Ford" className={field} /></div>
      <div><label className={label} htmlFor="model">Model</label><input id="model" value={f.model} onChange={set("model")} placeholder="F-150" className={field} /></div>
      <div><label className={label} htmlFor="mileage">Mileage</label><input id="mileage" inputMode="numeric" value={f.mileage} onChange={set("mileage")} placeholder="48000" className={field} /></div>
      <div>
        <label className={label} htmlFor="state">State</label>
        <select id="state" value={f.state} onChange={set("state")} className={field}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <label className="flex h-11 items-center gap-2 self-end text-sm">
        <input type="checkbox" checked={f.originalOwner} onChange={(e) => setF({ ...f, originalOwner: e.target.checked })} className="size-4 accent-accent" />
        I bought it new
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button type="submit" disabled={!ready || busy}
          className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted">
          {busy ? "Saving…" : "Save car"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm font-medium text-body hover:text-ink">Cancel</button>}
      </div>
    </form>
  );
}
