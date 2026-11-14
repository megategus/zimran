"use client";

import { useState } from "react";
import type { DueService, LineStatus, LineVerdict, QuoteVerdict } from "@/lib/types";
import { miles, usd } from "./format";

export type Pricing = { monthCents: number; yearCents: number; trialDays: number };

export type CheckResult = {
  checkId: string;
  verdict: QuoteVerdict & { locked: boolean };
  plan: DueService[];
  recallsUnavailable?: boolean;
};

const STATUS: Record<LineStatus, { label: string; dot: string; chip: string }> = {
  fair: { label: "Fair", dot: "bg-ok", chip: "bg-ok-soft text-[#1c7a47]" },
  high: { label: "Priced high", dot: "bg-warn", chip: "bg-warn-soft text-warn-ink" },
  upsell: { label: "Likely upsell", dot: "bg-warn", chip: "bg-warn-soft text-warn-ink" },
  warranty: { label: "Warranty may cover", dot: "bg-accent", chip: "bg-accent-soft text-accent-deep" },
  recall: { label: "Open recall", dot: "bg-accent", chip: "bg-accent-soft text-accent-deep" },
  unknown: { label: "No benchmark", dot: "bg-muted", chip: "bg-inset text-body" },
};

export function Verdict({ result, sample, pricing }: { result: CheckResult; sample: boolean; pricing: Pricing }) {
  const v = result.verdict;
  const stats = [
    { label: "Quote total", value: usd(v.totalCents) },
    { label: "You may not owe", value: usd(v.overpayCents), accent: v.overpayCents > 0 },
    { label: "Lines to question", value: `${v.flaggedCount} of ${v.lines.length}` },
  ];
  return (
    <div className="mt-6" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">Your result</h3>
        {sample && <span className="rounded-full bg-inset px-2.5 py-0.5 text-xs font-medium text-body">Sample quote</span>}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-3 sm:p-4">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums sm:text-2xl ${s.accent ? "text-accent-deep" : ""}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
      {result.recallsUnavailable && (
        <p className="mt-3 text-sm text-warn-ink">NHTSA recall data could not be reached, so recalls were not checked this time.</p>
      )}
      <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
        {v.lines.map((l, i) => (
          <Line key={i} l={l} />
        ))}
      </ul>
      {v.locked && <Paywall pricing={pricing} />}
      {result.plan.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Coming up for this car</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {result.plan.slice(0, 6).map((d) => (
              <li key={d.jobKey} className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2 text-sm">
                <span>{d.label}</span>
                <span className={`shrink-0 text-xs tabular-nums ${d.overdue ? "font-medium text-warn-ink" : "text-muted"}`}>
                  {d.overdue ? "Overdue" : d.dueMiles ? `at ${miles(d.dueMiles)}` : d.dueDate}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{v.disclaimer}</p>
    </div>
  );
}

function Line({ l }: { l: LineVerdict }) {
  const s = STATUS[l.status];
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{l.line.raw}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">{usd(l.line.totalCents)}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}>
          <span className={`size-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
        {l.fairLowCents != null && l.fairHighCents != null && (
          <span className="text-xs text-body tabular-nums">
            Fair estimate {usd(l.fairLowCents)} to {usd(l.fairHighCents)}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-body">{l.reason}</p>
      {l.sayToShop && (
        <p className="mt-2 rounded-control bg-inset px-3 py-2 text-[13px] leading-relaxed">
          <span className="font-medium">Say to the shop: </span>
          {l.sayToShop}
        </p>
      )}
    </li>
  );
}

function Paywall({ pricing }: { pricing: Pricing }) {
  const [busy, setBusy] = useState<"month" | "year">();
  const [error, setError] = useState<string>();
  const start = async (interval: "month" | "year") => {
    setBusy(interval); setError(undefined);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interval, returnTo: "/" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError("Checkout could not start. Please try again in a moment.");
      setBusy(undefined);
    }
  };
  const btn = "h-11 rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-60";
  return (
    <div className="mt-3 rounded-card border border-line bg-inset p-4">
      <p className="text-sm font-semibold">Unlock the full report with Plus</p>
      <p className="mt-1 text-sm text-body">
        The fair range on every line and the exact words to say to the shop. Free for {pricing.trialDays} days, then{" "}
        {usd(pricing.monthCents)} a month or {usd(pricing.yearCents)} a year.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} onClick={() => start("year")} className={`${btn} bg-accent text-white hover:bg-accent-deep`}>
          {busy === "year" ? "Opening checkout…" : `Start trial, ${usd(pricing.yearCents)}/year`}
        </button>
        <button type="button" disabled={!!busy} onClick={() => start("month")} className={`${btn} border border-line bg-surface hover:border-muted/50`}>
          {busy === "month" ? "Opening checkout…" : `Start trial, ${usd(pricing.monthCents)}/month`}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Demo checkout in Stripe test mode. Use card 4242 4242 4242 4242 with any future date and CVC. No real charge.</p>
      {error && <p role="alert" className="mt-2 text-sm text-warn-ink">{error}</p>}
    </div>
  );
}
