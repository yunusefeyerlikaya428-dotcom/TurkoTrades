import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ReferenceLine,
  Cell,
} from "recharts";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}
function fmt(n) {
  if (Number.isNaN(Number(n))) return "0.00";
  return Number(n).toFixed(2);
}
function compactMoney(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v === 0) return "";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + "k";
  if (abs >= 100) return sign + String(Math.round(abs));
  return sign + String(Math.round(abs));
}

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "$0.00";
  return `$${fmt(x)}`;
}
function compactMoneyUSD(n) {
  const s = compactMoney(n);
  return s ? `${s}$` : "";
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatTRDate(ymdStr) {
  if (!ymdStr || typeof ymdStr !== "string") return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdStr);
  if (!m) return ymdStr;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

const SESSION_OPTIONS = [
  { v: "New York AM", t: "New York AM" },
  { v: "New York PM", t: "New York PM" },
  { v: "New York Lunch", t: "New York Lunch" },
  { v: "London", t: "London" },
  { v: "Asia", t: "Asia" },
];

function Heatmap({ big = false, monthTitle, calendar, monthCursor, setMonthCursor }) {
  const cellSize = big ? 85 : 72;
  const gapSize = 8;
  const radiusClass = "rounded-[8px]";

  return (
    <Card className={cn(big ? "p-6 h-full" : "h-full")}>
      <div className="flex items-center justify-between">
        <div>
          <div className={cn("text-zinc-200", big ? "text-base font-semibold" : "text-sm")}>
            Monthly Heatmap
          </div>
          <div className="text-xs text-zinc-500">{monthTitle}</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            onClick={() =>
              setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
            }
            title="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            onClick={() =>
              setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
            }
            title="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="grid justify-center"
          style={{
            gridTemplateColumns: `repeat(7, ${cellSize}px)`,
            gap: `${gapSize}px`,
          }}
        >
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <div key={d} className="text-center text-[11px] text-zinc-500">
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 overflow-x-auto">
        <div
          className="grid justify-center text-xs"
          style={{
            gridTemplateColumns: `repeat(7, ${cellSize}px)`,
            gap: `${gapSize}px`,
          }}
        >
          {calendar.map((c, idx) => {
            if (!c)
              return (
                <div
                  key={idx}
                  className={cn("border border-transparent bg-transparent", radiusClass)}
                  style={{ width: cellSize, height: cellSize }}
                />
              );

            const pnl = c.pnl;
            const intensity = clamp(Math.abs(pnl) / 120, 0, 1);
            const bg =
              pnl > 0
                ? `rgba(34,197,94,${0.10 + intensity * 0.35})`
                : pnl < 0
                ? `rgba(239,68,68,${0.10 + intensity * 0.35})`
                : `rgba(255,255,255,0.05)`;

            return (
              <div
                key={c.key}
                title={`${c.key} • ${money(pnl)} • ${c.count || 0} trade`}
                className={cn(
                  "border border-white/10 hover:border-white/20 transition p-2",
                  radiusClass
                )}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: bg,
                }}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{c.d}</span>

                    <div className="flex flex-col items-end leading-tight">
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          pnl > 0 ? "text-emerald-200" : pnl < 0 ? "text-red-200" : "text-zinc-300"
                        )}
                      >
                        {compactMoneyUSD(pnl)}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-400">
                    {c.count ? `${c.count} trade` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function NewTradeForm({
  subtitle = "Hızlı ekleme",
  form,
  setForm,
  handleSubmit,
  sessionOptions,
  pointValue,
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const dateRef = useRef(null);

  useEffect(() => {
    if (!dateOpen) return;
    const onDown = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [dateOpen]);

  return (
    <Card className="lg:col-span-1 relative z-20 overflow-visible">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-200">New Trade</div>
          <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
          Quick add
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-3"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Symbol"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="NQ1"
          />
          <Select
            label="Direction"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            options={[
              { v: "LONG", t: "LONG" },
              { v: "SHORT", t: "SHORT" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Risk %"
            value={form.riskPct}
            onChange={(e) => setForm({ ...form, riskPct: e.target.value })}
            placeholder="1"
            type="number"
            step="0.1"
            min="0"
          />

          <div className="relative z-[120] block overflow-visible" ref={dateRef}>
            <div className="mb-1 text-xs text-zinc-400">Date</div>

            <button
              type="button"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-left text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/40 hover:border-white/20"
              onClick={() => setDateOpen((v) => !v)}
            >
              <span className={cn(form.date ? "text-zinc-100" : "text-zinc-600")}>
                {form.date ? formatTRDate(form.date) : "gg.aa.yyyy"}
              </span>
              <span className="float-right opacity-70">📅</span>
            </button>

            {dateOpen && (
              <div className="absolute left-0 top-full z-[9999] mt-2 rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between px-2 pb-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                    onClick={() => {
                      const today = new Date();
                      setForm({ ...form, date: ymd(today) });
                      setDateOpen(false);
                    }}
                  >
                    Bugün
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                    onClick={() => {
                      setForm({ ...form, date: "" });
                      setDateOpen(false);
                    }}
                  >
                    Temizle
                  </button>
                </div>

                <DayPicker
                  mode="single"
                  selected={form.date ? new Date(form.date) : undefined}
                  onSelect={(date) => {
                    setForm({
                      ...form,
                      date: date ? date.toISOString().slice(0, 10) : "",
                    });
                    setDateOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <Select
          label="Session"
          value={form.session}
          onChange={(e) => setForm({ ...form, session: e.target.value })}
          options={sessionOptions}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Entry"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
            placeholder="6788"
            type="number"
          />
          <Input
            label="Exit"
            value={form.exit}
            onChange={(e) => setForm({ ...form, exit: e.target.value })}
            placeholder="6771"
            type="number"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Manual PnL ($)"
            value={form.pnlManual}
            onChange={(e) => setForm({ ...form, pnlManual: e.target.value })}
            placeholder="120 / -55"
            type="number"
            step="0.01"
          />
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-zinc-400">Auto calc</div>
            <div className="mt-1 text-sm text-zinc-200">
              Point value: <span className="text-zinc-300">{pointValue}</span>
            </div>
          </div>
        </div>

        <Input
          label="Screenshot URL (optional)"
          value={form.screenshot}
          onChange={(e) => setForm({ ...form, screenshot: e.target.value })}
          placeholder="https://..."
        />

        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">Trade Notes</div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={5}
            placeholder="Trade notes"
            className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500/40"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/10 hover:opacity-95"
        >
          Add Trade
        </button>
      </form>
    </Card>
  );
}

function Dropdown({ value, onChange, options, className, buttonClassName, menuClassName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => String(o.v) === String(value)) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const fireChange = (v) => {
    if (typeof onChange === "function") onChange({ target: { value: v } });
  };

  return (
    <div ref={ref} className={cn("relative z-[120] overflow-visible", className)}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none hover:border-white/20 focus:ring-2 focus:ring-purple-500/40",
          "flex items-center justify-between gap-3",
          buttonClassName
        )}
      >
        <span className="truncate">{selected?.t ?? "Select"}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          className={cn("opacity-70 transition", open ? "rotate-180" : "")}
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-[9999] mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur",
            menuClassName
          )}
        >
          <div className="max-h-72 overflow-auto p-1">
            {options.map((o) => {
              const active = String(o.v) === String(value);
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => {
                    fireChange(o.v);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-white/10 text-zinc-100"
                      : "text-zinc-200 hover:bg-white/5"
                  )}
                >
                  {o.t}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [trades, setTrades] = useState([]);
  const [range, setRange] = useState(30);
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [monthCursor, setMonthCursor] = useState(new Date());

  const [accountSize, setAccountSize] = useState(() => {
    const v = localStorage.getItem("tt_accountSize");
    return v ? Number(v) : 10000;
  });
  const [pointValue, setPointValue] = useState(() => {
    const v = localStorage.getItem("tt_pointValue");
    return v ? Number(v) : 1;
  });

  useEffect(() => {
    localStorage.setItem("tt_accountSize", String(Number(accountSize || 0)));
  }, [accountSize]);
  useEffect(() => {
    localStorage.setItem("tt_pointValue", String(Number(pointValue || 0)));
  }, [pointValue]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  const [form, setForm] = useState({
    symbol: "",
    direction: "LONG",
    riskPct: 1,
    session: "New York AM",
    entry: "",
    exit: "",
    pnlManual: "",
    date: "",
    notes: "",
    screenshot: "",
  });

  const fetchTrades = async () => {
    const { data, error } = await supabase.from("trades").select("*").order("created_at", {
      ascending: false,
    });

    if (error) {
      console.log("FETCH ERROR:", error);
      return;
    }
    setTrades(data || []);
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const symbols = useMemo(() => {
    const s = new Set(trades.map((t) => (t.symbol || "").toUpperCase()).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [trades]);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return trades
      .filter((t) => {
        const td = new Date(t.date);
        const inRange = !Number.isNaN(td) ? td >= from : true;
        const symOk =
          symbolFilter === "ALL" ? true : (t.symbol || "").toUpperCase() === symbolFilter;
        return inRange && symOk;
      })
      .slice()
      .reverse();
  }, [trades, range, symbolFilter]);

  const tradeRR = (t) => {
    const acc = Number(accountSize);
    const riskPct = Number(t.risk_pct ?? 0);
    const pnl = Number(t.pnl ?? 0);
    if (!Number.isFinite(acc) || acc <= 0) return 0;
    if (!Number.isFinite(riskPct) || riskPct <= 0) return 0;
    const riskDollar = (acc * riskPct) / 100;
    if (!Number.isFinite(riskDollar) || riskDollar <= 0) return 0;
    return pnl / riskDollar;
  };

  const stats = useMemo(() => {
    const total = filtered.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const wins = filtered.filter((t) => Number(t.pnl || 0) > 0).length;
    const losses = filtered.filter((t) => Number(t.pnl || 0) < 0).length;
    const winRate = filtered.length ? (wins / filtered.length) * 100 : 0;

    const avgWin = wins
      ? filtered.filter((t) => Number(t.pnl) > 0).reduce((a, t) => a + Number(t.pnl), 0) / wins
      : 0;

    const avgLoss = losses
      ? filtered.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0) / losses
      : 0;

    const grossWin = filtered
      .filter((t) => Number(t.pnl) > 0)
      .reduce((a, t) => a + Number(t.pnl), 0);

    const grossLossAbs = Math.abs(
      filtered.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0)
    );

    const pf = grossLossAbs > 0 ? grossWin / grossLossAbs : grossWin > 0 ? 999 : 0;
    const rrs = filtered.map(tradeRR).filter((x) => Number.isFinite(x) && x !== 0);
    const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

    return {
      total,
      wins,
      losses,
      winRate,
      avgWin,
      avgLoss,
      pf,
      count: filtered.length,
      avgRR,
      grossWin,
      grossLossAbs,
    };
  }, [filtered, accountSize]);

  const balance = useMemo(() => {
    const start = Number(accountSize);
    if (!Number.isFinite(start)) return 0;
    return start + Number(stats.total || 0);
  }, [accountSize, stats.total]);

  const returnPct = useMemo(() => {
    const acc = Number(accountSize);
    if (!acc || !Number.isFinite(acc) || acc <= 0) return 0;
    return (Number(stats.total || 0) / acc) * 100;
  }, [stats.total, accountSize]);

  const equitySeries = useMemo(() => {
    let eq = Number(accountSize) || 0;
    return filtered.map((t) => {
      eq += Number(t.pnl || 0);
      return { date: t.date, equity: Number(eq.toFixed(2)) };
    });
  }, [filtered, accountSize]);

  const drawdownSeries = useMemo(() => {
    let peak = -Infinity;
    return equitySeries.map((p) => {
      const eq = Number(p.equity || 0);
      peak = Math.max(peak, eq);
      const dd = eq - peak;
      return { date: p.date, drawdown: Number(dd.toFixed(2)) };
    });
  }, [equitySeries]);

  const drawdownStats = useMemo(() => {
    const dds = drawdownSeries.map((x) => Number(x.drawdown || 0));
    const maxDD = dds.length ? Math.min(...dds) : 0;
    const avgDD = dds.length ? dds.reduce((a, b) => a + b, 0) / dds.length : 0;
    return { maxDD, avgDD };
  }, [drawdownSeries]);

  const streaks = useMemo(() => {
    let curWin = 0,
      curLoss = 0,
      maxWin = 0,
      maxLoss = 0;

    for (const t of filtered) {
      const pnl = Number(t.pnl || 0);
      if (pnl > 0) {
        curWin += 1;
        curLoss = 0;
      } else if (pnl < 0) {
        curLoss += 1;
        curWin = 0;
      } else {
        curWin = 0;
        curLoss = 0;
      }
      maxWin = Math.max(maxWin, curWin);
      maxLoss = Math.max(maxLoss, curLoss);
    }
    return { maxWin, maxLoss };
  }, [filtered]);

  const dow = useMemo(() => {
    const names = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const agg = new Map();
    for (const t of filtered) {
      if (!t.date) continue;
      const d = new Date(t.date);
      if (Number.isNaN(d)) continue;
      const k = d.getDay();
      const pnl = Number(t.pnl || 0);
      const cur = agg.get(k) || { day: names[k], pnl: 0, count: 0, wins: 0 };
      cur.pnl += pnl;
      cur.count += 1;
      if (pnl > 0) cur.wins += 1;
      agg.set(k, cur);
    }
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((k) => {
      const x = agg.get(k) || { day: names[k], pnl: 0, count: 0, wins: 0 };
      const wr = x.count ? (x.wins / x.count) * 100 : 0;
      return { ...x, pnl: Number(x.pnl.toFixed(2)), winRate: Number(wr.toFixed(2)) };
    });
  }, [filtered]);

  const dayCards = useMemo(() => {
    if (!dow.length) return null;
    const onlyActive = dow.filter((x) => x.count > 0);
    const bestPnL = onlyActive.slice().sort((a, b) => b.pnl - a.pnl)[0] || null;
    const worstPnL = onlyActive.slice().sort((a, b) => a.pnl - b.pnl)[0] || null;
    const mostActive = onlyActive.slice().sort((a, b) => b.count - a.count)[0] || null;
    const bestWR = onlyActive.slice().sort((a, b) => b.winRate - a.winRate)[0] || null;
    return { bestPnL, worstPnL, mostActive, bestWR };
  }, [dow]);

  const symbolPerf = useMemo(() => {
    const m = new Map();
    for (const t of filtered) {
      const s = (t.symbol || "").toUpperCase();
      if (!s) continue;
      const cur = m.get(s) || { symbol: s, pnl: 0, count: 0, wins: 0 };
      const pnl = Number(t.pnl || 0);
      cur.pnl += pnl;
      cur.count += 1;
      if (pnl > 0) cur.wins += 1;
      m.set(s, cur);
    }
    const arr = Array.from(m.values()).map((x) => ({
      ...x,
      pnl: Number(x.pnl.toFixed(2)),
      winRate: x.count ? Number(((x.wins / x.count) * 100).toFixed(2)) : 0,
    }));
    arr.sort((a, b) => b.pnl - a.pnl);
    return arr;
  }, [filtered]);

  const bestSymbol = useMemo(() => symbolPerf[0] || null, [symbolPerf]);

  const sessionPerf = useMemo(() => {
    const m = new Map();
    for (const t of filtered) {
      const s = t.session || "—";
      const cur = m.get(s) || { session: s, pnl: 0, count: 0, wins: 0 };
      const pnl = Number(t.pnl || 0);
      cur.pnl += pnl;
      cur.count += 1;
      if (pnl > 0) cur.wins += 1;
      m.set(s, cur);
    }
    const arr = Array.from(m.values()).map((x) => ({
      ...x,
      pnl: Number(x.pnl.toFixed(2)),
      winRate: x.count ? Number(((x.wins / x.count) * 100).toFixed(2)) : 0,
    }));
    arr.sort((a, b) => b.pnl - a.pnl);
    return arr;
  }, [filtered]);

  const pnlByDay = useMemo(() => {
    const m = new Map();
    for (const t of trades) {
      if (!t.date) continue;
      m.set(t.date, (m.get(t.date) || 0) + Number(t.pnl || 0));
    }
    return m;
  }, [trades]);

  const tradeCountByDay = useMemo(() => {
    const m = new Map();
    for (const t of trades) {
      if (!t.date) continue;
      m.set(t.date, (m.get(t.date) || 0) + 1);
    }
    return m;
  }, [trades]);

  const calendar = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    const startWeekday = (start.getDay() + 6) % 7;
    const daysInMonth = end.getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
      const key = ymd(dt);
      const pnl = pnlByDay.get(key) || 0;
      const count = tradeCountByDay.get(key) || 0;
      cells.push({ d, key, pnl, count });
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthCursor, pnlByDay, tradeCountByDay]);

  const calendarCharts = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const daysInMonth = endOfMonth(monthCursor).getDate();

    const daily = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      pnl: 0,
      count: 0,
    }));

    for (const t of trades || []) {
      if (!t.date) continue;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== y || d.getMonth() !== m) continue;

      const idx = d.getDate() - 1;
      daily[idx].pnl += Number(t.pnl || 0);
      daily[idx].count += 1;
    }

    let run = 0;
    const cumulative = daily.map((x) => {
      run += x.pnl;
      return { day: x.day, cumPnL: Number(run.toFixed(2)) };
    });

    return {
      daily: daily.map((x) => ({ ...x, pnl: Number(x.pnl.toFixed(2)) })),
      cumulative,
    };
  }, [trades, monthCursor]);

  const openTrade = (t) => {
    setSelectedTrade(t);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedTrade(null), 160);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const symbol = (form.symbol || "").trim().toUpperCase();
    const entry = Number(form.entry);
    const exit = Number(form.exit);
    const riskPct = Number(form.riskPct);
    const manual = form.pnlManual !== "" ? Number(form.pnlManual) : null;

    if (!symbol || !form.date || !Number.isFinite(riskPct)) {
      alert("Symbol, date, risk% zorunlu.");
      return;
    }

    let pnl = 0;
    if (manual !== null && Number.isFinite(manual)) {
      pnl = Number(manual.toFixed(2));
    } else {
      if (!Number.isFinite(entry) || !Number.isFinite(exit)) {
        alert("Manual PnL girmiyorsan Entry + Exit zorunlu.");
        return;
      }
      const diff = form.direction === "SHORT" ? Number(entry - exit) : Number(exit - entry);
      pnl = Number((diff * Number(pointValue || 1)).toFixed(2));
    }

    const { error } = await supabase.from("trades").insert([
      {
        date: form.date,
        symbol,
        direction: form.direction,
        session: form.session,
        entry: Number.isFinite(entry) ? entry : null,
        exit: Number.isFinite(exit) ? exit : null,
        pnl,
        risk_pct: Number.isFinite(riskPct) ? riskPct : null,
        notes: (form.notes || "").trim() || null,
        screenshot_url: (form.screenshot || "").trim() || null,
      },
    ]);

    if (error) {
      console.log("SUPABASE INSERT ERROR:", error);
      alert(error.message);
      return;
    }

    setForm({
      symbol: "",
      direction: "LONG",
      riskPct: 1,
      session: "New York AM",
      entry: "",
      exit: "",
      pnlManual: "",
      date: "",
      notes: "",
      screenshot: "",
    });

    fetchTrades();
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = confirm("Bu trade silinsin mi?");
    if (!ok) return;

    const { error } = await supabase.from("trades").delete().eq("id", id);

    if (error) {
      console.log("DELETE ERROR:", error);
      alert(error.message);
      return;
    }

    if (selectedTrade?.id === id) closeDrawer();
    fetchTrades();
  };

  const monthTitle = monthCursor.toLocaleString("tr-TR", { month: "long", year: "numeric" });

  const rangeOptions = [
    { v: 7, t: "Son 7 gün" },
    { v: 30, t: "Son 30 gün" },
    { v: 90, t: "Son 90 gün" },
    { v: 365, t: "Son 1 yıl" },
  ];

  const symbolOptions = symbols.map((s) => ({ v: s, t: s === "ALL" ? "All symbols" : s }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 -left-48 h-[520px] w-[520px] rounded-full bg-purple-700/40 blur-[140px]" />
        <div className="absolute top-0 right-0 h-[520px] w-[520px] rounded-full bg-fuchsia-600/30 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[160px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="relative sticky top-0 flex h-screen w-[78px] flex-col items-center gap-3 border-r border-white/10 bg-zinc-950/55 py-4 backdrop-blur-xl">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-purple-500/0 via-purple-500/30 to-purple-500/0" />

          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <img src="/logo-icon.png" alt="TurkoTrades" className="h-9 w-9 object-contain" />
          </div>

          <NavIcon
            active={activeNav === "dashboard"}
            onClick={() => setActiveNav("dashboard")}
            label="Dashboard"
          >
            ⌂
          </NavIcon>
          <NavIcon active={activeNav === "trades"} onClick={() => setActiveNav("trades")} label="Trades">
            ≡
          </NavIcon>
          <NavIcon
            active={activeNav === "calendar"}
            onClick={() => setActiveNav("calendar")}
            label="Calendar"
          >
            ▦
          </NavIcon>
          <NavIcon
            active={activeNav === "settings"}
            onClick={() => setActiveNav("settings")}
            label="Settings"
          >
            ⚙
          </NavIcon>

          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5" />
            <div className="text-[10px] text-zinc-500">supabase</div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/45 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="TurkoTrades" className="h-10 md:h-12 w-auto object-contain" />

                <div className="text-xs text-zinc-500">
                  Net: <span className="text-zinc-300">{money(stats.total)}</span> • Balance:{" "}
                  <span className="text-zinc-300">{money(balance)}</span> • Return:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      returnPct >= 0 ? "text-emerald-300" : "text-red-300"
                    )}
                  >
                    {fmt(returnPct)}%
                  </span>{" "}
                  • <span className="text-zinc-400">{stats.count} trade</span> • Avg RR:{" "}
                  <span className="text-zinc-300">{fmt(stats.avgRR)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <input
                    value={accountSize}
                    onChange={(e) => setAccountSize(Number(e.target.value))}
                    type="number"
                    className="w-24 bg-transparent text-sm outline-none placeholder:text-zinc-600"
                    placeholder="10000"
                  />
                  <span className="text-xs text-zinc-500">Start</span>
                </div>

                <Dropdown
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  options={symbolOptions}
                  className="w-[160px]"
                />

                <Dropdown
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                  options={rangeOptions}
                  className="w-[140px]"
                />

                <button
                  type="button"
                  onClick={fetchTrades}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>
            </div>

            {activeNav === "dashboard" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Kpi
                    title="Net PnL"
                    value={money(stats.total)}
                    tone={stats.total >= 0 ? "good" : "bad"}
                    sub={`${stats.wins}W / ${stats.losses}L`}
                  />
                  <Kpi
                    title="Balance"
                    value={money(balance)}
                    tone={balance >= accountSize ? "good" : "bad"}
                    sub={`Start: ${money(accountSize)}`}
                  />
                  <Kpi
                    title="Profit Factor"
                    value={stats.pf >= 999 ? "∞" : fmt(stats.pf)}
                    tone={stats.pf >= 1.5 ? "good" : stats.pf >= 1 ? "neutral" : "bad"}
                    sub="Gross profit / gross loss"
                  />
                  <Kpi
                    title="Avg RR"
                    value={fmt(stats.avgRR)}
                    tone={stats.avgRR >= 0.5 ? "good" : stats.avgRR >= 0 ? "neutral" : "bad"}
                    sub={`Streak: ${streaks.maxWin}W / ${streaks.maxLoss}L`}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.35fr]">
                  <Heatmap
                    big
                    monthTitle={monthTitle}
                    calendar={calendar}
                    monthCursor={monthCursor}
                    setMonthCursor={setMonthCursor}
                  />

                  <Card className="h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Account Growth</div>
                        <div className="text-xs text-zinc-500">Equity curve</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
                        {fmt(returnPct)}%
                      </span>
                    </div>

                    <div className="mt-3 h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equitySeries}>
                          <defs>
                            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(168,85,247,0.55)" />
                              <stop offset="100%" stopColor="rgba(168,85,247,0.00)" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(v) => [money(v), "Balance"]}
                            contentStyle={{
                              background: "rgba(9,9,11,0.92)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="equity"
                            stroke="rgba(168,85,247,0.95)"
                            strokeWidth={2.6}
                            fill="url(#eqFill)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                      <MiniKpi
                        label="Net Growth"
                        value={money(stats.total)}
                        tone={stats.total >= 0 ? "good" : "bad"}
                      />
                      <MiniKpi
                        label="Return"
                        value={`${fmt(returnPct)}%`}
                        tone={returnPct >= 0 ? "good" : "bad"}
                      />
                      <MiniKpi
                        label="Max Drawdown"
                        value={money(drawdownStats.maxDD)}
                        tone={drawdownStats.maxDD < 0 ? "bad" : "neutral"}
                      />
                      <MiniKpi label="Trades" value={String(stats.count)} tone="neutral" />
                    </div>
                  </Card>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card>
                    <div className="text-sm text-zinc-200">Top Symbol (PnL)</div>
                    <div className="mt-3">
                      {bestSymbol ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">{bestSymbol.symbol}</div>
                            <div
                              className={cn(
                                "text-sm font-semibold",
                                bestSymbol.pnl >= 0 ? "text-emerald-200" : "text-red-200"
                              )}
                            >
                              {money(bestSymbol.pnl)}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {bestSymbol.count} trade • WR {fmt(bestSymbol.winRate)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">No data.</div>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {symbolPerf.slice(0, 5).map((s) => (
                        <div
                          key={s.symbol}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                        >
                          <span className="text-zinc-200">{s.symbol}</span>
                          <span className={cn(s.pnl >= 0 ? "text-emerald-200" : "text-red-200")}>
                            {money(s.pnl)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="lg:col-span-2">
                    <div className="text-sm text-zinc-200">Day Analysis</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <DayCard
                        title="Best performing day"
                        value={dayCards?.bestPnL?.day || "—"}
                        meta={`${dayCards?.bestPnL?.count || 0} trades`}
                        badge={dayCards?.bestPnL ? money(dayCards.bestPnL.pnl) : "$0.00"}
                        tone="good"
                      />
                      <DayCard
                        title="Least performing day"
                        value={dayCards?.worstPnL?.day || "—"}
                        meta={`${dayCards?.worstPnL?.count || 0} trades`}
                        badge={dayCards?.worstPnL ? money(dayCards.worstPnL.pnl) : "$0.00"}
                        tone="bad"
                      />
                      <DayCard
                        title="Most active day"
                        value={dayCards?.mostActive?.day || "—"}
                        meta={`${dayCards?.mostActive?.count || 0} trades`}
                        badge="Active"
                        tone="neutral"
                      />
                      <DayCard
                        title="Best win rate day"
                        value={dayCards?.bestWR?.day || "—"}
                        meta={`${dayCards?.bestWR?.count || 0} trades`}
                        badge={`${fmt(dayCards?.bestWR?.winRate || 0)}%`}
                        tone="good"
                      />
                    </div>
                  </Card>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <NewTradeForm
                    subtitle="Dashboard quick add"
                    form={form}
                    setForm={setForm}
                    handleSubmit={handleSubmit}
                    sessionOptions={SESSION_OPTIONS}
                    pointValue={pointValue}
                  />

                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Recent Trades</div>
                        <div className="text-xs text-zinc-500">Last 15 entries</div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-zinc-300">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3">Session</th>
                            <th className="px-4 py-3">Risk</th>
                            <th className="px-4 py-3">PnL</th>
                            <th className="px-4 py-3">RR</th>
                            <th className="px-4 py-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filtered
                            .slice(-15)
                            .slice()
                            .reverse()
                            .map((t) => (
                              <tr
                                key={t.id}
                                className="cursor-pointer hover:bg-white/5"
                                onClick={() => openTrade(t)}
                              >
                                <td className="px-4 py-3 text-zinc-400">{t.date}</td>
                                <td className="px-4 py-3">{(t.symbol || "").toUpperCase()}</td>
                                <td className="px-4 py-3 text-zinc-300">{t.session || "—"}</td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {t.risk_pct !== undefined && t.risk_pct !== null && t.risk_pct !== ""
                                    ? `${t.risk_pct}%`
                                    : "—"}
                                </td>
                                <td
                                  className={cn(
                                    "px-4 py-3 font-medium",
                                    Number(t.pnl) >= 0 ? "text-emerald-300" : "text-red-300"
                                  )}
                                >
                                  {money(t.pnl)}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">{fmt(tradeRR(t))}</td>
                                <td className="px-4 py-3">
                                  <div className="max-w-[420px] truncate text-zinc-300">
                                    {(t.notes || "").trim() || "—"}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">Dashboard • Supabase</div>
              </>
            )}

            {activeNav === "trades" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <MiniStat
                    title="Net PnL"
                    value={money(stats.total)}
                    subtitle={`${stats.count} trades • Balance ${money(balance)}`}
                    good={stats.total >= 0}
                    series={equitySeries.map((x) => x.equity)}
                  />
                  <RingStat
                    title="Profit Factor"
                    value={stats.pf >= 999 ? 3 : stats.pf}
                    label={stats.pf >= 999 ? "∞" : fmt(stats.pf)}
                    kind="pf"
                  />
                  <RingStat
                    title="Trade Win %"
                    value={stats.winRate / 100}
                    label={`${fmt(stats.winRate)}%`}
                    kind="wr"
                  />
                  <BarStat title="Avg win/loss" left={stats.avgWin} right={Math.abs(stats.avgLoss)} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Drawdown</div>
                        <div className="text-xs text-zinc-500">Peak-to-trough</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
                        {drawdownSeries.length} pts
                      </span>
                    </div>

                    <div className="mt-3 h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={drawdownSeries}>
                          <defs>
                            <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(239,68,68,0.45)" />
                              <stop offset="100%" stopColor="rgba(239,68,68,0.00)" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(v) => [money(v), "Drawdown"]}
                            contentStyle={{
                              background: "rgba(9,9,11,0.92)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                            }}
                          />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                          <Area
                            type="monotone"
                            dataKey="drawdown"
                            stroke="rgba(239,68,68,0.9)"
                            strokeWidth={2.2}
                            fill="url(#ddFill)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[11px] text-zinc-400">Max Drawdown</div>
                        <div className="mt-1 text-sm font-semibold text-red-200">
                          {money(drawdownStats.maxDD)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[11px] text-zinc-400">Avg Drawdown</div>
                        <div className="mt-1 text-sm font-semibold text-zinc-200">
                          {money(drawdownStats.avgDD)}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Session Performance</div>
                        <div className="text-xs text-zinc-500">London / NY AM / NY PM</div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {sessionPerf.length ? (
                        sessionPerf.slice(0, 6).map((s) => (
                          <div
                            key={s.session}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                          >
                            <div>
                              <div className="text-zinc-200">{s.session}</div>
                              <div className="text-[11px] text-zinc-500">
                                {s.count} trade • WR {fmt(s.winRate)}%
                              </div>
                            </div>
                            <div
                              className={cn(
                                "font-semibold",
                                s.pnl >= 0 ? "text-emerald-200" : "text-red-200"
                              )}
                            >
                              {money(s.pnl)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-zinc-500">No data.</div>
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                      Streak: <span className="text-zinc-200">{streaks.maxWin}W</span> /{" "}
                      <span className="text-zinc-200">{streaks.maxLoss}L</span> • Avg RR:{" "}
                      <span className="text-zinc-200">{fmt(stats.avgRR)}</span>
                    </div>
                  </Card>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <NewTradeForm
                    subtitle="Hızlı ekleme"
                    form={form}
                    setForm={setForm}
                    handleSubmit={handleSubmit}
                    sessionOptions={SESSION_OPTIONS}
                    pointValue={pointValue}
                  />

                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Trades</div>
                        <div className="text-xs text-zinc-500">Click row → right panel</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
                        Table
                      </span>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-zinc-300">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3">Dir</th>
                            <th className="px-4 py-3">Session</th>
                            <th className="px-4 py-3">Risk</th>
                            <th className="px-4 py-3">Entry</th>
                            <th className="px-4 py-3">Exit</th>
                            <th className="px-4 py-3">PnL</th>
                            <th className="px-4 py-3">RR</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3">SS</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {filtered
                            .slice()
                            .reverse()
                            .slice(0, 80)
                            .reverse()
                            .map((t) => (
                              <tr
                                key={t.id}
                                className="cursor-pointer hover:bg-white/5"
                                onClick={() => openTrade(t)}
                              >
                                <td className="px-4 py-3 text-zinc-400">{t.date}</td>
                                <td className="px-4 py-3">{(t.symbol || "").toUpperCase()}</td>

                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "rounded-full border px-2 py-1 text-[10px]",
                                      t.direction === "LONG"
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                        : "border-red-500/30 bg-red-500/10 text-red-200"
                                    )}
                                  >
                                    {t.direction}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-zinc-300">{t.session || "—"}</td>

                                <td className="px-4 py-3 text-zinc-300">
                                  {t.risk_pct !== undefined && t.risk_pct !== null && t.risk_pct !== ""
                                    ? `${t.risk_pct}%`
                                    : "—"}
                                </td>

                                <td className="px-4 py-3 text-zinc-300">{t.entry ?? "—"}</td>
                                <td className="px-4 py-3 text-zinc-300">{t.exit ?? "—"}</td>

                                <td
                                  className={cn(
                                    "px-4 py-3 font-medium",
                                    Number(t.pnl) >= 0 ? "text-emerald-300" : "text-red-300"
                                  )}
                                >
                                  {money(t.pnl)}
                                </td>

                                <td className="px-4 py-3 text-zinc-300">{fmt(tradeRR(t))}</td>

                                <td className="px-4 py-3">
                                  <div className="max-w-[220px] truncate text-zinc-300">
                                    {(t.notes || "").trim() || "—"}
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {t.screenshot_url ? (
                                    <a
                                      href={t.screenshot_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-purple-300 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Open ↗
                                    </a>
                                  ) : (
                                    <span className="text-zinc-500">—</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(t.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">
                  Trades • right panel
                </div>
              </>
            )}

            {activeNav === "calendar" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                  <Heatmap
                    big
                    monthTitle={monthTitle}
                    calendar={calendar}
                    monthCursor={monthCursor}
                    setMonthCursor={setMonthCursor}
                  />

                  <div className="space-y-4">
                    <Card>
                      <div className="text-sm text-zinc-200">Daily Net PnL</div>
                      <div className="mt-3 h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={calendarCharts.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis
                              dataKey="day"
                              stroke="rgba(255,255,255,0.45)"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                            <Tooltip
                              formatter={(v) => [money(v), "PnL"]}
                              contentStyle={{
                                background: "rgba(9,9,11,0.92)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 14,
                              }}
                            />
                            <Bar dataKey="pnl">
                              {(calendarCharts.daily || []).map((x, i) => (
                                <Cell
                                  key={i}
                                  fill={
                                    x.pnl > 0
                                      ? "rgba(34,197,94,0.65)"
                                      : x.pnl < 0
                                      ? "rgba(239,68,68,0.65)"
                                      : "rgba(255,255,255,0.18)"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card>
                      <div className="text-sm text-zinc-200">Daily Trade Count</div>
                      <div className="mt-3 h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={calendarCharts.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis
                              dataKey="day"
                              stroke="rgba(255,255,255,0.45)"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.45)"
                              tick={{ fontSize: 12 }}
                              allowDecimals={false}
                            />
                            <Tooltip
                              formatter={(v) => [v, "Trades"]}
                              contentStyle={{
                                background: "rgba(9,9,11,0.92)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 14,
                              }}
                            />
                            <Bar dataKey="count" fill="rgba(168,85,247,0.55)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card>
                      <div className="text-sm text-zinc-200">Cumulative PnL (MTD)</div>
                      <div className="mt-3 h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={calendarCharts.cumulative}>
                            <defs>
                              <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(168,85,247,0.55)" />
                                <stop offset="100%" stopColor="rgba(168,85,247,0.00)" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis
                              dataKey="day"
                              stroke="rgba(255,255,255,0.45)"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                            <Tooltip
                              formatter={(v) => [money(v), "Cum PnL"]}
                              contentStyle={{
                                background: "rgba(9,9,11,0.92)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 14,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="cumPnL"
                              stroke="rgba(168,85,247,0.95)"
                              strokeWidth={2.2}
                              fill="url(#cumFill)"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">Calendar • monthly view</div>
              </>
            )}

            {activeNav === "settings" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <div className="text-sm text-zinc-200">Settings</div>

                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Starting Balance</div>
                        <input
                          value={accountSize}
                          onChange={(e) => setAccountSize(Number(e.target.value))}
                          type="number"
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">Point Value (Auto PnL)</div>
                        <input
                          value={pointValue}
                          onChange={(e) => setPointValue(Number(e.target.value))}
                          type="number"
                          step="0.01"
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none"
                        />
                        <div className="mt-1 text-[11px] text-zinc-500">
                          Auto PnL: (Exit-Entry) × Point Value
                        </div>
                      </label>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                        Avg RR: <span className="text-zinc-200">{fmt(stats.avgRR)}</span> • PF:{" "}
                        <span className="text-zinc-200">{stats.pf >= 999 ? "∞" : fmt(stats.pf)}</span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-zinc-200">Danger Zone</div>
                    <div className="mt-4 text-xs text-zinc-400"></div>
                  </Card>
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">Settings</div>
              </>
            )}
          </div>
        </main>
      </div>

      <div className={cn("fixed inset-0 z-50", drawerOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeDrawer}
        />

        <div
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-white/10 bg-zinc-950/60 backdrop-blur-xl transition-transform duration-200",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-medium text-zinc-200">Trade Detail</div>
                <div className="text-xs text-zinc-500"></div>
              </div>

              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {!selectedTrade ? (
                <div className="text-sm text-zinc-400">No selection.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Symbol" value={(selectedTrade.symbol || "").toUpperCase()} />
                    <Info label="Direction" value={selectedTrade.direction} />
                    <Info label="Date" value={selectedTrade.date} />
                    <Info
                      label="Risk %"
                      value={
                        selectedTrade.risk_pct !== undefined &&
                        selectedTrade.risk_pct !== null &&
                        selectedTrade.risk_pct !== ""
                          ? `${selectedTrade.risk_pct}%`
                          : "—"
                      }
                    />
                    <Info label="Session" value={selectedTrade.session ? selectedTrade.session : "—"} />
                    <Info label="Entry" value={String(selectedTrade.entry ?? "—")} />
                    <Info label="Exit" value={String(selectedTrade.exit ?? "—")} />
                    <Info label="RR" value={fmt(tradeRR(selectedTrade))} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-zinc-400">PnL</div>
                    <div
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        Number(selectedTrade.pnl) >= 0 ? "text-emerald-300" : "text-red-300"
                      )}
                    >
                      {money(selectedTrade.pnl)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-zinc-400">Notes</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                      {(selectedTrade.notes || "").trim() || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-400">Screenshot</div>
                      {selectedTrade.screenshot_url ? (
                        <a
                          href={selectedTrade.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-purple-300 hover:underline"
                        >
                          Open ↗
                        </a>
                      ) : null}
                    </div>

                    {selectedTrade.screenshot_url ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                        <img
                          src={selectedTrade.screenshot_url}
                          alt="screenshot"
                          className="max-h-[360px] w-full bg-black/30 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-zinc-500">—</div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20"
                      onClick={() => handleDelete(selectedTrade.id)}
                    >
                      Delete trade
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4 text-xs text-zinc-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ className, children }) {
  return (
    <div
      className={cn(
        "relative overflow-visible rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function MiniKpi({ label, value, tone = "neutral" }) {
  const t =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : tone === "bad"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : "border-white/10 bg-white/5 text-zinc-200";

  return (
    <div className={cn("rounded-xl border p-3", t)}>
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Kpi({ title, value, sub, tone }) {
  const badge =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20"
      : tone === "bad"
      ? "bg-red-500/10 text-red-200 border-red-500/20"
      : "bg-white/5 text-zinc-200 border-white/10";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">{title}</div>
        <div className={cn("rounded-full border px-2 py-1 text-[10px]", badge)}>{sub}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function DayCard({ title, value, meta, badge, tone }) {
  const t =
    tone === "good"
      ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/20"
      : tone === "bad"
      ? "text-red-200 bg-red-500/10 border-red-500/20"
      : "text-zinc-200 bg-white/5 border-white/10";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] text-zinc-400">{title}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
      <div className="mt-1 flex items-center justify-between">
        <div className="text-xs text-zinc-500">{meta}</div>
        <div className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", t)}>{badge}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-400">{label}</div>
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500/40"
      />
    </label>
  );
}

function Select({ label, options, value, onChange, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-400">{label}</div>
      <Dropdown value={value} onChange={onChange} options={options} {...props} />
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function NavIcon({ active, onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-2xl border text-sm transition",
        active
          ? "border-white/20 bg-white/10 shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_30px_-10px_rgba(168,85,247,0.45)]"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      )}
    >
      <span
        className={cn(
          "absolute -left-[18px] h-6 w-[3px] rounded-full transition-opacity",
          active ? "opacity-100 bg-purple-400" : "opacity-0"
        )}
      />
      <span className={cn("transition", active ? "text-zinc-100" : "text-zinc-300 group-hover:text-zinc-100")}>
        {children}
      </span>
    </button>
  );
}

function MiniStat({ title, value, subtitle, series = [], good }) {
  const data = (series || []).slice(-30).map((v, i) => ({ i, v }));
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className={cn("mt-1 text-2xl font-semibold", good ? "text-emerald-200" : "text-red-200")}>
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>

      <div className="mt-3 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke="rgba(168,85,247,0.95)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RingStat({ title, value, label, kind }) {
  const v = Number(value);
  const pct =
    kind === "wr" ? Math.max(0, Math.min(1, v)) : Math.max(0, Math.min(1, (Number.isFinite(v) ? v : 0) / 3));

  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="text-xs text-zinc-400">{title}</div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-2xl font-semibold">{label}</div>

        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} stroke="rgba(255,255,255,0.10)" strokeWidth="6" fill="none" />
          <circle
            cx="26"
            cy="26"
            r={r}
            stroke="rgba(34,197,94,0.85)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 26 26)"
          />
        </svg>
      </div>

      <div className="mt-1 text-xs text-zinc-500">Last 30 entries</div>
    </div>
  );
}

function BarStat({ title, left, right }) {
  const L = Math.max(0, Number(left) || 0);
  const R = Math.max(0, Number(right) || 0);
  const max = Math.max(L, R, 1);
  const lp = (L / max) * 100;
  const rp = (R / max) * 100;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="text-xs text-zinc-400">{title}</div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-emerald-200">{money(L)}</span>
        <span className="text-red-200">{money(-R)}</span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-emerald-400/70" style={{ width: `${lp}%` }} />
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-red-400/70" style={{ width: `${rp}%` }} />
        </div>
      </div>
    </div>
  );
}