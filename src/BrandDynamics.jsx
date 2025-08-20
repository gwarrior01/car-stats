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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

const INITIAL_BRANDS = [
  { name: "Toyota", value: 0 },
  { name: "Volkswagen", value: 0 },
  { name: "Honda", value: 0 },
  { name: "Ford", value: 0 },
  { name: "Hyundai", value: 0 },
  { name: "Nissan", value: 0 },
  { name: "Suzuki", value: 0 },
  { name: "Kia", value: 0 },
  { name: "Chevrolet", value: 0 },
  { name: "BYD", value: 0 },
];

export default function BrandDynamics() {
  const [data, setData] = useState(INITIAL_BRANDS);
  const [year, setYear] = useState(1820);
  const [month, setMonth] = useState(1);
  const timerRef = useRef(null);

  const start = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setData((prev) => {
        const updated = prev.map((b) => ({
          ...b,
          value: b.value + Math.floor(Math.random() * 1000),
        }));
        updated.sort((a, b) => b.value - a.value);
        return [...updated];
      });

      setMonth((m) => {
        if (m === 12) {
          setYear((y) => y + 1);
          return 1;
        }
        return m + 1;
      });
    }, 500);
  };

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
              <div className="text-lg font-medium">
                {year} г. {String(month).padStart(2, "0")} мес.
              </div>
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

