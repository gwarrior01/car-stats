import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import csvData from "@/dataset/car_brand_dataset.csv?raw";

const COLORS = [
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
];

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const [yearStr, brand, valueStr] = lines[i].split(",");
    const year = Number(yearStr);
    const value = Number(valueStr);
    if (!map.has(year)) {
      map.set(year, { year });
    }
    map.get(year)[brand] = value;
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

const SERIES = parseCSV(csvData);

function extractStep(step) {
  const entry = SERIES[Math.min(step, SERIES.length - 1)];
  const { year, ...brands } = entry;
  const data = Object.entries(brands)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  return { year, data };
}

export default function BrandDynamics() {
  const [step, setStep] = useState(0);
  const { year: initialYear, data: initialData } = extractStep(0);
  const [data, setData] = useState(initialData);
  const [year, setYear] = useState(initialYear);
  const timerRef = useRef(null);

  const start = () => {
    if (timerRef.current) return;
    setStep(0);
    timerRef.current = setInterval(() => {
      setStep((prev) => {
        if (prev + 1 >= SERIES.length) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const { year, data } = extractStep(step);
    setYear(year);
    setData(data);
  }, [step]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">CarStats</h1>
          <Link
            to="/"
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            На главную
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Динамика брендов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={start}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Старт
              </button>
              <div className="text-lg font-medium">{year} г.</div>
            </div>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Bar
                  dataKey="value"
                  isAnimationActive
                  animationDuration={400}
                  animationEasing="ease-in-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

