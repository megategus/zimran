import sampleQuotes from "@/db/seed/sample_quotes.json";
import { CarPhoto } from "@/components/CarPhoto";
import { Checker, type Sample } from "@/components/Checker";

// Sample labels look like "Sample: 2019 Honda Civic, 34,800 mi, coolant and fuel system upsell".
// The exact odometer comes from the quote text itself.
const samples: Sample[] = (sampleQuotes as { id: string; label: string; text: string }[]).flatMap((q) => {
  const m = q.label.match(/^Sample:\s*(\d{4})\s+(\S+)\s+([^,]+),\s*([\d,]+)\s*mi,\s*(.+)$/);
  if (!m) return [];
  return [{ id: q.id, year: Number(m[1]), make: m[2], model: m[3], mileage: Number(m[4].replace(/,/g, "")), note: m[5] }];
});

const CHECKS = [
  { title: "Fair price", text: "Labor hours times your state's shop rate, plus parts." },
  { title: "Warranty", text: "Work the maker may still owe you for free." },
  { title: "Recalls", text: "Open NHTSA recalls tied to a line on the quote." },
  { title: "Schedule", text: "Services the maker does not ask for at your mileage." },
];

const GARAGE = [
  { model: "F-150", name: "Ford F-150" },
  { model: "Silverado", name: "Chevrolet Silverado 1500" },
  { model: "RAV4", name: "Toyota RAV4 Hybrid" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <section className="grid items-center gap-6 py-8 md:grid-cols-[1fr_1.15fr] md:gap-10 md:py-14">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Car repair quotes</p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold sm:text-4xl">Before you pay the shop, check the quote.</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-body">
            Paste or photograph a repair quote. Every line is checked against a fair price for your state, your warranty,
            open recalls and the maker&apos;s service schedule.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href="#check" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep">
              Check a quote
            </a>
            <span className="text-sm text-muted">No sign-up needed</span>
          </div>
        </div>
        <div className="relative rounded-card bg-surface px-5 pt-10 pb-7 shadow-card sm:px-10">
          <CarPhoto model="RAV4" alt="Silver Toyota RAV4 Hybrid, front three-quarter view" priority sizes="(min-width: 768px) 560px, 92vw" />
          <Marker className="top-[62%] left-[10%]" label="Open recalls" />
          <Marker className="top-[24%] left-[50%]" label="Warranty cover" tone="ok" />
          <Marker className="top-[74%] left-[72%]" label="Fair price range" />
        </div>
      </section>

      <section aria-label="What gets checked" className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4">
        {CHECKS.map((c) => (
          <div key={c.title} className="bg-surface p-4">
            <h2 className="text-sm font-semibold">{c.title}</h2>
            <p className="mt-1 text-[13px] leading-snug text-body">{c.text}</p>
          </div>
        ))}
      </section>

      <Checker samples={samples} />

      <section aria-label="Popular US models" className="mt-10">
        <h2 className="text-lg font-semibold">Built around the cars Americans drive</h2>
        <p className="mt-1 text-sm text-body">Works for any car from 1981 on. Add yours by VIN or by year, make and model.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {GARAGE.map((g) => (
            <figure key={g.model} className="rounded-card bg-surface p-5 shadow-card">
              <div className="flex aspect-[2/1] items-end">
                <div className="w-full">
                  <CarPhoto model={g.model} alt={g.name} sizes="(min-width: 640px) 320px, 88vw" />
                </div>
              </div>
              <figcaption className="mt-3 text-sm font-medium">{g.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

function Marker({ className, label, tone = "accent" }: { className: string; label: string; tone?: "accent" | "ok" }) {
  return (
    <div className={`absolute flex items-center gap-2 ${className}`}>
      <span className={`size-3.5 rounded-full border-2 border-white shadow-float ${tone === "ok" ? "bg-ok" : "bg-accent"}`} />
      <span className="hidden rounded-lg bg-surface px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-float sm:block">{label}</span>
    </div>
  );
}
