import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { PieChart, Pie, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";

// TopoJSON for world map
const WORLD_TOPOJSON = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Mock data ---
// Country -> total cars (very roughly made-up numbers for demo)
const countryCars = {
  "United States of America": 290_000_000,
  China: 350_000_000,
  India: 120_000_000,
  Japan: 82_000_000,
  Germany: 48_000_000,
  France: 38_000_000,
  "United Kingdom": 40_000_000,
  Brazil: 48_000_000,
  Russia: 56_000_000,
  Mexico: 35_000_000,
  Italy: 41_000_000,
  Canada: 26_000_000,
  Spain: 30_000_000,
  Australia: 20_000_000,
  Indonesia: 22_000_000,
  Turkey: 26_000_000,
  "South Korea": 26_000_000, // FIX: ключ со пробелом должен быть в кавычках
  Iran: 18_000_000,
  Thailand: 17_000_000,
  "Saudi Arabia": 12_000_000,
  Argentina: 15_000_000,
  Poland: 14_000_000,
  Netherlands: 9_000_000,
  Belgium: 6_000_000,
  Sweden: 6_000_000,
  Norway: 2_800_000,
  Switzerland: 4_600_000,
  Austria: 5_200_000,
  Ukraine: 8_000_000,
  "South Africa": 12_000_000, // FIX: тоже в кавычках
  Egypt: 7_000_000,
};

// Brands share for the global pie (purely illustrative)
const brandShares = [
  { name: "Toyota", value: 12.5 },
  { name: "Volkswagen", value: 11.2 },
  { name: "Hyundai/Kia", value: 8.4 },
  { name: "GM", value: 7.8 },
  { name: "Ford", value: 6.1 },
  { name: "Honda", value: 5.5 },
  { name: "Nissan", value: 4.2 },
  { name: "Stellantis", value: 7.0 },
  { name: "BYD", value: 4.8 },
  { name: "Tesla", value: 3.1 },
  { name: "Geely", value: 3.6 },
  { name: "Other", value: 26.0 },
];

// Colors for the pie segments (kept neutral; Recharts will cycle if fewer than data)
const PIE_COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
  "#9edae5",
  "#c5b0d5",
];

function formatNumber(n) {
  return Intl.NumberFormat().format(n);
}

function normalizeName(props) {
  // Try several common property keys across Natural Earth variants
  const name =
    props?.NAME ||
    props?.name ||
    props?.ADMIN ||
    props?.name_long ||
    props?.formal_en ||
    props?.BRK_NAME ||
    "Unknown";
  // Simple special cases
  if (name === "United States") return "United States of America";
  if (name === "Korea, South") return "South Korea";
  if (name === "Russian Federation") return "Russia";
  if (name === "Congo (Kinshasa)") return "Democratic Republic of the Congo";
  if (name === "Congo (Brazzaville)") return "Republic of the Congo";
  if (name === "Czechia") return "Czech Republic"; // fallback if needed
  return name;
}

function useWorldTotals() {
  const totalFromCountries = useMemo(
    () => Object.values(countryCars).reduce((a, b) => a + b, 0),
    []
  );
  // Convert brand share percent into absolute numbers scaled to country total
  const brandsAbs = useMemo(() => {
    return brandShares.map((b) => ({
      name: b.name,
      value: Math.round((b.value / 100) * totalFromCountries),
      percent: b.value,
    }));
  }, [totalFromCountries]);
  return { totalFromCountries, brandsAbs };
}

function MapTooltip({ x, y, content, visible }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-xl bg-white/90 px-3 py-2 text-sm shadow-lg ring-1 ring-black/10"
      style={{ left: x + 12, top: y + 12 }}
    >
      {content}
    </div>
  );
}

function useChoroplethScale() {
  const values = Object.values(countryCars);
  const max = Math.max(1, ...values);
  const steps = [
    "#eef2ff",
    "#dbeafe",
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#1d4ed8",
  ];
  return (v) => {
    if (!v) return "#f8fafc";
    const r = v / max;
    const idx = Math.min(steps.length - 1, Math.floor(r * steps.length));
    return steps[idx];
  };
}

// --- простейшие самотесты без jest/vitest ---
function runSelfTests({ totalFromCountries, brandsAbs }) {
  const results = [];
  const approx = (a, b, tol = 1e-2) => Math.abs(a - b) <= Math.max(1, b) * tol;

  // 1) normalizeName special cases
  const nnCases = [
    [{ NAME: "United States" }, "United States of America"],
    [{ NAME: "Korea, South" }, "South Korea"],
    [{ NAME: "Russian Federation" }, "Russia"],
    [{ NAME: "Czechia" }, "Czech Republic"],
  ];
  nnCases.forEach(([input, expected], i) => {
    const actual = normalizeName(input);
    results.push({
      name: `normalizeName #${i + 1}`,
      ok: actual === expected,
      details: `got="${actual}" expected="${expected}"`,
    });
  });

  // 2) countryCars includes quoted keys with spaces
  results.push({
    name: "countryCars['South Korea'] present",
    ok: typeof countryCars["South Korea"] === "number" && countryCars["South Korea"] > 0,
    details: `value=${countryCars["South Korea"]}`,
  });
  results.push({
    name: "countryCars['South Africa'] present",
    ok: typeof countryCars["South Africa"] === "number" && countryCars["South Africa"] > 0,
    details: `value=${countryCars["South Africa"]}`,
  });

  // 3) brandShares converted to absolute sums ~ totalFromCountries
  const sumBrands = brandsAbs.reduce((a, b) => a + b.value, 0);
  results.push({
    name: "brandsAbs sum ≈ total",
    ok: approx(sumBrands, totalFromCountries, 0.02), // 2% из‑за округления и 100.2%
    details: `sumBrands=${sumBrands} total=${totalFromCountries}`,
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  return { results, passed, failed };
}

export default function App() {
  const { totalFromCountries, brandsAbs } = useWorldTotals();
  const colorFor = useChoroplethScale();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: "" });

  // самотесты
  const [{ results: testResults, passed, failed }, setTests] = useState({ results: [], passed: 0, failed: 0 });
  useEffect(() => {
    setTests(runSelfTests({ totalFromCountries, brandsAbs }));
  }, [totalFromCountries, brandsAbs]);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">CarStats</h1>
          <div className="text-sm text-slate-500">Demo • React • Map + Pie</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* World Map Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Автомобили по странам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ComposableMap projectionConfig={{ scale: 140 }} className="w-full h-[520px]">
                <Geographies geography={WORLD_TOPOJSON}>
                  {({ geographies }) => (
                    <>
                      {geographies.map((geo) => {
                        const countryName = normalizeName(geo.properties);
                        const value = countryCars[countryName] || 0;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={(evt) => {
                              setTooltip({
                                visible: true,
                                x: evt.clientX,
                                y: evt.clientY,
                                content: (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{countryName}</span>
                                    <span className="text-slate-600">{value ? `${formatNumber(value)} авто` : "Нет данных"}</span>
                                  </div>
                                ),
                              });
                            }}
                            onMouseMove={(evt) => {
                              setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }));
                            }}
                            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                            style={{
                              default: { fill: colorFor(value), outline: "none" },
                              hover: { fill: "#0ea5e9", outline: "none" },
                              pressed: { fill: "#0284c7", outline: "none" },
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </Geographies>
              </ComposableMap>
              <MapTooltip {...tooltip} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Всего автомобилей (по данным макета): {formatNumber(totalFromCountries)}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-[#eef2ff]"></span>
                мало
                <span className="inline-block h-3 w-3 rounded bg-[#1d4ed8]"></span>
                много
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Доли брендов в мировом автопарке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="col-span-2 h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                    <Pie
                      data={brandsAbs}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      innerRadius={70}
                      paddingAngle={1}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {brandsAbs.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <motion.div
                className="col-span-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="rounded-2xl border p-4 bg-white shadow-sm">
                  <div className="text-sm text-slate-500">Всего автомобилей (по круговой):</div>
                  <div className="text-3xl font-semibold">{formatNumber(totalFromCountries)}</div>
                  <p className="mt-3 text-slate-600 text-sm">
                    Диаграмма показывает условные доли крупнейших брендов. Размер сектора
                    пропорционален доле бренда от общего количества автомобилей.
                  </p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Self-tests summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Self-tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">Пройдено: {passed} • Провалено: {failed}</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {testResults?.map((t, idx) => (
                <li key={idx} className={t.ok ? "text-emerald-600" : "text-rose-600"}>
                  {t.name} — {t.ok ? "OK" : "FAIL"} <span className="text-slate-500">({t.details})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="py-2 text-center text-xs text-slate-500">
          Демо-данные для прототипа. Замените на реальные источники при интеграции.
        </div>
      </main>
    </div>
  );
}
