import { useEffect, useMemo, useState } from "react";
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
} from "recharts";

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

/** Para formatı ($) */
function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "$0.00";
  return `$${fmt(x)}`;
}
/** Compact değerin yanına $ */
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

const SESSION_OPTIONS = [
  { v: "New York AM", t: "New York AM" },
  { v: "New York PM", t: "New York PM" },
  { v: "New York Lunch", t: "New York Lunch" },
  { v: "London", t: "London" },
  { v: "Asia", t: "Asia" },
];

/* =========================
   ✅ App DIŞI BİLEŞENLER
   ========================= */

function Heatmap({
  big = false,
  monthTitle,
  calendar,
  monthCursor,
  setMonthCursor,
}) {
  return (
    <Card className={big ? "p-6" : ""}>
      <div className="flex items-center justify-between">
        <div>
          <div
            className={cn(
              "text-zinc-200",
              big ? "text-base font-semibold" : "text-sm"
            )}
          >
            Monthly Heatmap
          </div>
          <div className="text-xs text-zinc-500">{monthTitle}</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            onClick={() =>
              setMonthCursor(
                new Date(
                  monthCursor.getFullYear(),
                  monthCursor.getMonth() - 1,
                  1
                )
              )
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
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            onClick={() =>
              setMonthCursor(
                new Date(
                  monthCursor.getFullYear(),
                  monthCursor.getMonth() + 1,
                  1
                )
              )
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

      <div
        className={cn(
          "mt-4 grid grid-cols-7 text-xs",
          big ? "gap-3" : "gap-2"
        )}
      >
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
          <div key={d} className="text-center text-zinc-500">
            {d}
          </div>
        ))}

        {calendar.map((c, idx) => {
          if (!c)
            return (
              <div
                key={idx}
                className={cn("aspect-square w-full rounded-lg", "bg-transparent")}
              />
            );

          const pnl = c.pnl;
          const intensity = clamp(Math.abs(pnl) / 50, 0, 1);
          const bg =
            pnl > 0
              ? `rgba(34,197,94,${0.10 + intensity * 0.40})`
              : pnl < 0
              ? `rgba(239,68,68,${0.10 + intensity * 0.40})`
              : `rgba(255,255,255,0.05)`;

          return (
            <div
              key={c.key}
              title={`${c.key} • ${money(pnl)} • ${c.count || 0} trade`}
              className={cn(
                "aspect-square w-full rounded-lg",
                "border border-white/10 p-2"
              )}
              style={{ background: bg }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-zinc-100",
                    big ? "text-base font-semibold" : "text-sm font-medium"
                  )}
                >
                  {c.d}
                </span>

                <div className="flex flex-col items-end leading-tight">
                  <span
                    className={cn(
                      big ? "text-xs font-semibold" : "text-[10px]",
                      pnl > 0
                        ? "text-emerald-200"
                        : pnl < 0
                        ? "text-red-200"
                        : "text-zinc-400"
                    )}
                  >
                    {compactMoneyUSD(pnl)}
                  </span>

                  <span
                    className={cn(
                      "mt-1 text-zinc-400",
                      big ? "text-[11px]" : "text-[10px]"
                    )}
                  >
                    {c.count ? `${c.count} trade` : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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
}) {
  return (
    <Card className="lg:col-span-1">
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
          <Input
            label="Date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            type="date"
          />
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

        <Input
          label="Screenshot URL (opsiyonel)"
          value={form.screenshot}
          onChange={(e) => setForm({ ...form, screenshot: e.target.value })}
          placeholder="https://..."
        />

        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">Notlar</div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={5}
            placeholder="FVG / OB / bias / psikoloji..."
            className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500/40"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/10 hover:opacity-95"
        >
          Trade Ekle
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
        Not: Risk% + Session Supabase’e yazılıyor.
      </div>
    </Card>
  );
}

export default function App() {
  const [trades, setTrades] = useState([]);
  const [range, setRange] = useState(30);
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [accountSize, setAccountSize] = useState(10000);

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
    date: "",
    notes: "",
    screenshot: "",
  });

  // ✅ Supabase'ten çek
  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

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
    const s = new Set(
      trades.map((t) => (t.symbol || "").toUpperCase()).filter(Boolean)
    );
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
          symbolFilter === "ALL"
            ? true
            : (t.symbol || "").toUpperCase() === symbolFilter;

        return inRange && symOk;
      })
      .slice()
      .reverse(); // oldest->newest equity
  }, [trades, range, symbolFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const wins = filtered.filter((t) => Number(t.pnl || 0) > 0).length;
    const losses = filtered.filter((t) => Number(t.pnl || 0) < 0).length;
    const winRate = filtered.length ? (wins / filtered.length) * 100 : 0;

    const avgWin = wins
      ? filtered
          .filter((t) => Number(t.pnl) > 0)
          .reduce((a, t) => a + Number(t.pnl), 0) / wins
      : 0;

    const avgLoss = losses
      ? filtered
          .filter((t) => Number(t.pnl) < 0)
          .reduce((a, t) => a + Number(t.pnl), 0) / losses
      : 0;

    const grossWin = filtered
      .filter((t) => Number(t.pnl) > 0)
      .reduce((a, t) => a + Number(t.pnl), 0);

    const grossLossAbs = Math.abs(
      filtered
        .filter((t) => Number(t.pnl) < 0)
        .reduce((a, t) => a + Number(t.pnl), 0)
    );

    const pf =
      grossLossAbs > 0 ? grossWin / grossLossAbs : grossWin > 0 ? 999 : 0;

    return {
      total,
      wins,
      losses,
      winRate,
      avgWin,
      avgLoss,
      pf,
      count: filtered.length,
    };
  }, [filtered]);

  const returnPct = useMemo(() => {
    const acc = Number(accountSize);
    if (!acc || !Number.isFinite(acc) || acc <= 0) return 0;
    return (Number(stats.total || 0) / acc) * 100;
  }, [stats.total, accountSize]);

  const equitySeries = useMemo(() => {
    let eq = 0;
    return filtered.map((t) => {
      eq += Number(t.pnl || 0);
      return { date: t.date, equity: Number(eq.toFixed(2)) };
    });
  }, [filtered]);

  // ✅ Drawdown series
  const drawdownSeries = useMemo(() => {
    let peak = -Infinity;
    return equitySeries.map((p) => {
      const eq = Number(p.equity || 0);
      peak = Math.max(peak, eq);
      const dd = eq - peak; // <= 0
      return { date: p.date, drawdown: Number(dd.toFixed(2)) };
    });
  }, [equitySeries]);

  // ✅ Day of week analysis
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
    const order = [1, 2, 3, 4, 5, 6, 0]; // Pzt->Paz
    return order.map((k) => {
      const x = agg.get(k) || { day: names[k], pnl: 0, count: 0, wins: 0 };
      const wr = x.count ? (x.wins / x.count) * 100 : 0;
      return {
        ...x,
        pnl: Number(x.pnl.toFixed(2)),
        winRate: Number(wr.toFixed(2)),
      };
    });
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
    const startWeekday = (start.getDay() + 6) % 7; // Mon=0
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

    if (
      !symbol ||
      !form.date ||
      !Number.isFinite(entry) ||
      !Number.isFinite(exit) ||
      !Number.isFinite(riskPct)
    ) {
      alert("Symbol, date, risk%, entry, exit alanları zorunlu.");
      return;
    }

    // Basit PnL hesabı (point farkı). İstersen sonra $ çeviririz.
    const pnl =
      form.direction === "SHORT" ? Number((entry - exit).toFixed(2)) : Number((exit - entry).toFixed(2));

    const { error } = await supabase.from("trades").insert([
      {
        date: form.date,
        symbol,
        direction: form.direction,
        session: form.session,
        entry,
        exit,
        pnl,
        risk_pct: riskPct,
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

  const monthTitle = monthCursor.toLocaleString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ambient bg */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 -left-48 h-[520px] w-[520px] rounded-full bg-purple-700/40 blur-[140px]" />
        <div className="absolute top-0 right-0 h-[520px] w-[520px] rounded-full bg-fuchsia-600/30 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[160px]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="relative sticky top-0 flex h-screen w-[78px] flex-col items-center gap-3 border-r border-white/10 bg-zinc-950/55 py-4 backdrop-blur-xl">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-purple-500/0 via-purple-500/30 to-purple-500/0" />

          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-pink-500/10" />

          <NavIcon
            active={activeNav === "dashboard"}
            onClick={() => setActiveNav("dashboard")}
            label="Dashboard"
          >
            ⌂
          </NavIcon>
          <NavIcon
            active={activeNav === "trades"}
            onClick={() => setActiveNav("trades")}
            label="Trades"
          >
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

        {/* MAIN */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-6">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/45 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-pink-500/10" />
                <div>
                  <div className="flex items-center gap-2">
  <img src="/logo.png" alt="TurkoTrades" className="h-6" />
  <div className="text-sm font-medium text-zinc-200">
    TurkoTrades
  </div>
</div>
                  <div className="text-xs text-zinc-500">
                    Net:{" "}
                    <span className="text-zinc-300">{money(stats.total)}</span>{" "}
                    • Return:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        returnPct >= 0 ? "text-emerald-300" : "text-red-300"
                      )}
                    >
                      {fmt(returnPct)}%
                    </span>{" "}
                    • <span className="text-zinc-400">{stats.count} trade</span>
                  </div>
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
                  <span className="text-xs text-zinc-500">Account</span>
                </div>

                <select
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  {symbols.map((s) => (
                    <option key={s} value={s}>
                      {s === "ALL" ? "All symbols" : s}
                    </option>
                  ))}
                </select>

                <select
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value={7}>Son 7 gün</option>
                  <option value={30}>Son 30 gün</option>
                  <option value={90}>Son 90 gün</option>
                  <option value={365}>Son 1 yıl</option>
                </select>

                <button
                  type="button"
                  onClick={fetchTrades}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Yenile
                </button>
              </div>
            </div>

            {/* DASHBOARD */}
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
                    title="Win Rate"
                    value={`${fmt(stats.winRate)}%`}
                    tone={stats.winRate >= 50 ? "good" : "neutral"}
                    sub="kazanma oranı"
                  />
                  <Kpi
                    title="Profit Factor"
                    value={stats.pf >= 999 ? "∞" : fmt(stats.pf)}
                    tone={
                      stats.pf >= 1.5 ? "good" : stats.pf >= 1 ? "neutral" : "bad"
                    }
                    sub="brüt kâr / brüt zarar"
                  />
                  <Kpi
                    title="Avg Win / Avg Loss"
                    value={`${money(stats.avgWin)} / ${money(stats.avgLoss)}`}
                    tone="neutral"
                    sub="ortalama"
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Equity Curve</div>
                        <div className="text-xs text-zinc-500">
                          Filtreye göre kümülatif
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
                        {equitySeries.length} pts
                      </span>
                    </div>

                    <div className="mt-3 h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equitySeries}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(9,9,11,0.92)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="equity"
                            stroke="rgba(168,85,247,0.95)"
                            strokeWidth={2.6}
                            dot={false}
                            activeDot={{
                              r: 5,
                              stroke: "rgba(255,255,255,0.8)",
                              strokeWidth: 2,
                              fill: "rgba(168,85,247,1)",
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Heatmap
                    big
                    monthTitle={monthTitle}
                    calendar={calendar}
                    monthCursor={monthCursor}
                    setMonthCursor={setMonthCursor}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <NewTradeForm
                    subtitle="Dashboard quick add"
                    form={form}
                    setForm={setForm}
                    handleSubmit={handleSubmit}
                    sessionOptions={SESSION_OPTIONS}
                  />

                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Recent Trades</div>
                        <div className="text-xs text-zinc-500">
                          Son 15 trade (detaylı)
                        </div>
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
                                <td className="px-4 py-3 text-zinc-400">
                                  {t.date}
                                </td>
                                <td className="px-4 py-3">
                                  {(t.symbol || "").toUpperCase()}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {t.session || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {t.risk_pct !== undefined &&
                                  t.risk_pct !== null &&
                                  t.risk_pct !== ""
                                    ? `${t.risk_pct}%`
                                    : "—"}
                                </td>
                                <td
                                  className={cn(
                                    "px-4 py-3 font-medium",
                                    Number(t.pnl) >= 0
                                      ? "text-emerald-300"
                                      : "text-red-300"
                                  )}
                                >
                                  {money(t.pnl)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="max-w-[520px] truncate text-zinc-300">
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

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">
                  Dashboard • Supabase
                </div>
              </>
            )}

            {/* TRADES */}
            {activeNav === "trades" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <MiniStat
                    title="Net Cumulative P&L"
                    value={money(stats.total)}
                    subtitle={`${stats.count} trades`}
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
                  <BarStat
                    title="Avg win/loss"
                    left={stats.avgWin}
                    right={Math.abs(stats.avgLoss)}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Drawdown</div>
                        <div className="text-xs text-zinc-500">
                          Peak-to-trough (kümülatif)
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300">
                        {drawdownSeries.length} pts
                      </span>
                    </div>

                    <div className="mt-3 h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={drawdownSeries}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(v) => [money(v), "Drawdown"]}
                            contentStyle={{
                              background: "rgba(9,9,11,0.92)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="drawdown"
                            stroke="rgba(239,68,68,0.9)"
                            strokeWidth={2.2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Day of Week</div>
                        <div className="text-xs text-zinc-500">
                          PnL + trade count
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dow}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <XAxis
                            dataKey="day"
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.45)"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(v, name) => {
                              if (name === "pnl") return [money(v), "PnL"];
                              return [v, "Trades"];
                            }}
                            contentStyle={{
                              background: "rgba(9,9,11,0.92)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                            }}
                          />
                          <Bar dataKey="pnl" fill="rgba(168,85,247,0.75)" />
                          <Bar dataKey="count" fill="rgba(255,255,255,0.18)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      {dow.map((x) => (
                        <div
                          key={x.day}
                          className="rounded-xl border border-white/10 bg-white/5 p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-300">{x.day}</span>
                            <span className="text-zinc-500">{x.count} trade</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span
                              className={cn(
                                "font-medium",
                                x.pnl >= 0 ? "text-emerald-200" : "text-red-200"
                              )}
                            >
                              {money(x.pnl)}
                            </span>
                            <span className="text-zinc-500">{fmt(x.winRate)}%</span>
                          </div>
                        </div>
                      ))}
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
                  />

                  <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-200">Trades</div>
                        <div className="text-xs text-zinc-500">
                          Satıra tıkla → detay sağdan açılsın
                        </div>
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
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3">SS</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {filtered
                            .slice()
                            .reverse()
                            .slice(0, 60)
                            .reverse()
                            .map((t) => (
                              <tr
                                key={t.id}
                                className="cursor-pointer hover:bg-white/5"
                                onClick={() => openTrade(t)}
                              >
                                <td className="px-4 py-3 text-zinc-400">
                                  {t.date}
                                </td>
                                <td className="px-4 py-3">
                                  {(t.symbol || "").toUpperCase()}
                                </td>

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

                                <td className="px-4 py-3 text-zinc-300">
                                  {t.session || "—"}
                                </td>

                                <td className="px-4 py-3 text-zinc-300">
                                  {t.risk_pct !== undefined &&
                                  t.risk_pct !== null &&
                                  t.risk_pct !== ""
                                    ? `${t.risk_pct}%`
                                    : "—"}
                                </td>

                                <td className="px-4 py-3 text-zinc-300">
                                  {t.entry}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {t.exit}
                                </td>

                                <td
                                  className={cn(
                                    "px-4 py-3 font-medium",
                                    Number(t.pnl) >= 0
                                      ? "text-emerald-300"
                                      : "text-red-300"
                                  )}
                                >
                                  {money(t.pnl)}
                                </td>

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
                                      Aç ↗
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
                                    Sil
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
                  Trades • satıra tıkla → sağ panel
                </div>
              </>
            )}

            {/* CALENDAR */}
            {activeNav === "calendar" && (
              <>
                <div className="mt-5">
                  <Heatmap
                    big
                    monthTitle={monthTitle}
                    calendar={calendar}
                    monthCursor={monthCursor}
                    setMonthCursor={setMonthCursor}
                  />
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">
                  Calendar • aylık performans
                </div>
              </>
            )}

            {/* SETTINGS */}
            {activeNav === "settings" && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <div className="text-sm text-zinc-200">Settings</div>

                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <div className="mb-1 text-xs text-zinc-400">
                          Account Size
                        </div>
                        <input
                          value={accountSize}
                          onChange={(e) => setAccountSize(Number(e.target.value))}
                          type="number"
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                        DB: <span className="text-zinc-200">Supabase</span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-zinc-200">Danger Zone</div>
                    <div className="mt-4 text-xs text-zinc-400">
                      (Buraya ileride export/import, reset db vs. koyarız.)
                    </div>
                  </Card>
                </div>

                <div className="mt-8 pb-10 text-center text-xs text-zinc-500">
                  Settings
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
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
                <div className="text-sm font-medium text-zinc-200">
                  Trade Detail
                </div>
                <div className="text-xs text-zinc-500">
                  Uzun notlar burada kalsın, tablo temiz kalsın.
                </div>
              </div>

              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={closeDrawer}
              >
                Kapat
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {!selectedTrade ? (
                <div className="text-sm text-zinc-400">Seçim yok.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Info
                      label="Symbol"
                      value={(selectedTrade.symbol || "").toUpperCase()}
                    />
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
                    <Info
                      label="Session"
                      value={selectedTrade.session ? selectedTrade.session : "—"}
                    />
                    <Info
                      label="Entry"
                      value={String(selectedTrade.entry ?? "—")}
                    />
                    <Info label="Exit" value={String(selectedTrade.exit ?? "—")} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-zinc-400">PnL</div>
                    <div
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        Number(selectedTrade.pnl) >= 0
                          ? "text-emerald-300"
                          : "text-red-300"
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
                          Linki aç ↗
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
                        <div className="p-3 text-xs text-zinc-400">
                          Eğer görüntü görünmezse sorun değil — link yine çalışır.
                        </div>
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
                      Bu trade’i sil
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4 text-xs text-zinc-500">
              Panel sağdan kayar. Tablo “kısa”, detay “uzun”.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* UI blocks */
function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur",
        className
      )}
    >
      {children}
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
        <div className={cn("rounded-full border px-2 py-1 text-[10px]", badge)}>
          {sub}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
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

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-zinc-400">{label}</div>
      <select
        {...props}
        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/40"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
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
      <span
        className={cn(
          "transition",
          active ? "text-zinc-100" : "text-zinc-300 group-hover:text-zinc-100"
        )}
      >
        {children}
      </span>
    </button>
  );
}

/* Trades üst kartları */
function MiniStat({ title, value, subtitle, series = [], good }) {
  const data = (series || []).slice(-30).map((v, i) => ({ i, v }));
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="text-xs text-zinc-400">{title}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold",
          good ? "text-emerald-200" : "text-red-200"
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>

      <div className="mt-3 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="rgba(168,85,247,0.95)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RingStat({ title, value, label, kind }) {
  const v = Number(value);
  const pct =
    kind === "wr"
      ? Math.max(0, Math.min(1, v))
      : Math.max(0, Math.min(1, (Number.isFinite(v) ? v : 0) / 3)); // PF normalize

  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/45 p-5 backdrop-blur">
      <div className="text-xs text-zinc-400">{title}</div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-2xl font-semibold">{label}</div>

        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={r}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="6"
            fill="none"
          />
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