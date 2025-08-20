import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposableMap, Geographies, Geography, Sphere } from "react-simple-maps";
import { PieChart, Pie, Tooltip as RechartsTooltip, Cell, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";

// TopoJSON for world map
const WORLD_TOPOJSON = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Mock data ---
// Country -> total cars (very roughly made-up numbers for demo)
const countryCars = {
    "Austria": 5_633_525,
    "Belgium": 6_820_078,
    "Bulgaria": 3_385_940,
    "Croatia": 1_940_098,
    "Czechia": 6_931_618,
    "Denmark": 3_147_315,
    "Finland": 3_191_483,
    "France": 45_421_468,
    "Germany": 52_275_833,
    "Greece": 6_491_063,
    "Hungary": 4_515_769,
    "Ireland": 2_672_032,
    "Italy": 44_999_681,
    "Netherlands": 10_248_388,
    "Norway": 3_416_216,
    "Poland": 29_237_555,
    "Portugal": 6_591_000,
    "Romania": 8_517_728,
    "Slovakia": 2_799_302,
    "Spain": 29_707_581,
    "Sweden": 5_637_469,
    "Switzerland": 5215771,
    "United Kingdom": 42_403_988,
    "Belarus": 3_724_000,
    "Russia": 56_673_511,
    "Serbia": 2_430_672,
    "Turkey": 18_512_642,
    "Ukraine": 8_450_000,
    "Canada": 26_788_244,
    "Mexico": 45_086_615,
    "United States of America": 289_037_000,
    "Argentina": 14_025_113,
    "Brazil": 45_721_945,
    "Chile": 4_750_551,
    "Colombia": 5_659_794,
    "Ecuador": 2_678_251,
    "Peru": 2_945_462,
    "Venezuela": 4_234_553,
    "Australia": 18_924_450,
    "China": 318_034_467,
    "India": 45_687_000,
    "Indonesia": 21_114_412,
    "Iran": 15_962_671,
    "Iraq": 4_715_435,
    "Israel": 3_540_528,
    "Japan": 76_702_773,
    "Kazakhstan": 4_282_820,
    "Malaysia": 17_748_900,
    "New Zealand": 4_398_977,
    "Pakistan": 4_553_947,
    "Philippines": 4_317_267,
    "South Korea": 23_730_286,
    "Syria": 9_809_540,
    "Taiwan": 8_193_237,
    "Thailand": 19_773_217,
    "United Arab Emirates": 3_181_465,
    "Vietnam": 4_785_415,
    "Algeria": 6_239_942,
    "Egypt": 6_918_213,
    "Libya": 3_259_826,
    "Morocco": 4_120_233,
    "Nigeria": 11_605_207,
    "South Africa": 10_338_783
};

const brandShares = [
    { name: "Toyota", value: 8_569_973 },
    { name: "Volkswagen", value: 4_965_621 },
    { name: "Honda", value: 3_774_161 },
    { name: "Ford", value: 3_729_817 },
    { name: "Hyundai", value: 3_540_787 },
    { name: "Nissan", value: 2_975_048 },
    { name: "Suzuki", value: 2_916_149 },
    { name: "Kia", value: 2_731_370 },
    { name: "Chevrolet", value: 2_692_391 },
    { name: "BYD", value: 2_683_743 },
    { name: "BMW", value: 2_101_487 },
    { name: "Mercedes‑Benz", value: 2_063_820 },
    { name: "Audi", value: 1_772_892 },
    { name: "Tesla", value: 1_770_354 },
    { name: "Renault", value: 1_435_847 },
    { name: "Fiat", value: 1_235_442 },
    { name: "Mazda", value: 1_182_034 },
    { name: "Peugeot", value: 1_060_432 },
    { name: "Changan", value: 1_011_336 },
    { name: "Jeep", value: 1_008_181 },
    { name: "Geely", value: 1_002_311 },
    { name: "Tata", value: 937_087 },
    { name: "Subaru", value: 889_975 },
    { name: "Wuling", value: 851_935 },
    { name: "GAC", value: 839_537 },
    { name: "Skoda", value: 804_710 },
    { name: "Chery", value: 799_063 },
    { name: "Daihatsu", value: 783_416 },
    { name: "Volvo", value: 750_483 },
    { name: "Buick", value: 702_821 }
]

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
  // absolute sales numbers per brand
  const brandsAbs = useMemo(() => brandShares, []);
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

  return (v) => {
    if (!v) return "#f8fafc";
    const r = v / max; // нормализация 0..1

    // HSL: синий цвет (hue = 220), насыщенность 100%, яркость уменьшается от 90% до 30%
    const lightness = 90 - r * 60;
    return `hsl(220, 100%, ${lightness}%)`;
  };
}

function renderPieLabel({ x, y, name, percent }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
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

  // 3) brands are sorted by value descending
  const sortedDesc = brandsAbs.every((b, i, arr) => i === 0 || arr[i - 1].value >= b.value);
  results.push({
    name: "brandsAbs sorted desc",
    ok: sortedDesc,
    details: `top=${brandsAbs[0]?.value} bottom=${brandsAbs[brandsAbs.length - 1]?.value}`,
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  return { results, passed, failed };
}

export default function App() {
  const { totalFromCountries, brandsAbs } = useWorldTotals();
  const colorFor = useChoroplethScale();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: "" });

  const topCountries = useMemo(
    () =>
      Object.entries(countryCars)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    []
  );

  const topBrands = useMemo(() => brandsAbs.slice(0, 10), [brandsAbs]);

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
              <ComposableMap projectionConfig={{ scale: 220 }} className="w-full h-[750px]" style={{ width: "100%" }}>
                <Sphere stroke="#94a3b8" fill="none" />
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
            <div className="mt-4 flex justify-center">
              <table className="table-auto w-auto whitespace-nowrap text-sm">
                <thead>
                  <tr>
                    <th className="text-center pr-4">Место</th>
                    <th className="text-left pr-4">Страна</th>
                    <th className="text-right">Количество</th>
                  </tr>
                </thead>
                <tbody>
                  {topCountries.map(([name, value], index) => (
                    <tr key={name}>
                      <td className="text-center pr-4">{index + 1}</td>
                      <td className="text-left pr-4">{name}</td>
                      <td className="text-right">{formatNumber(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Всего автомобилей: {formatNumber(totalFromCountries)}<br/>
                По данным <a href="https://www.oica.net/" className="text-blue-600 underline hover:text-blue-700 hover:underline transition-colors" target="_blank" rel="noopener noreferrer">International Organization of Motor Vehicle Manufacturers 2015-2020</a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Данные по продажам за 2023г</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="col-span-2 h-[530px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <RechartsTooltip formatter={(value) => formatNumber(value)} />
                        <Pie
                            data={brandsAbs}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={225}
                            innerRadius={105}
                            paddingAngle={1}
                            labelLine={false}
                            label={renderPieLabel}
                        >
                      {brandsAbs.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="col-span-1">
                <div className="overflow-x-auto">
                  <table className="table-auto w-auto whitespace-nowrap text-sm">
                    <thead>
                      <tr>
                        <th className="text-center pr-2">Место</th>
                        <th className="text-left">Бренд</th>
                        <th className="text-right">Количество</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBrands.map((b, index) => (
                        <tr key={b.name}>
                          <td className="text-center pr-2">{index + 1}</td>
                          <td>{b.name}</td>
                          <td className="text-right">{formatNumber(b.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>По данным <a className="text-blue-600 underline hover:text-blue-700 hover:underline transition-colors" target="_blank" rel="noopener noreferrer"
                                href="https://roadgenius.com/cars/statistics/sales-by-manufacturer/">Worldwide Car Sales</a></div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
