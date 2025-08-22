import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import csvData from "@/dataset/bar_chart_race_from_1886.csv?raw";
import * as d3 from "d3";

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
const ALL_BRANDS = Array.from(
  new Set(
    SERIES.flatMap((d) => Object.keys(d).filter((k) => k !== "year"))
  )
);

const N = 25;
const TICK = 500;

export default function BrandDynamics({ svgWidth = 800, svgHeight = 500, containerHeight = 700, limitBarStretch = true, maxBarHeight = 28, minBarGap = 8 } = {}) {
  const svgRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const prevRanksRef = useRef(new Map());
  const currentXMaxRef = useRef(0);
  const updateRef = useRef(() => {});
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  useEffect(() => {
    const width = svgWidth;
    const height = svgHeight;
    const margin = { top: 70, right: 120, bottom: 30, left: 140 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleBand().range([0, innerHeight]).paddingInner(0.1);

    const xAxisG = g.append("g").attr("class", "x-axis").attr("display", "none");
    const barsG = g.append("g");
    const labelsG = g.append("g");
    const valuesG = g.append("g");

    const yearLabel = svg
      .append("text")
      .attr("x", margin.left + innerWidth / 2)
      // Place the year above the plotting area (not overlapping the x-axis)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 28)
      .attr("font-weight", 400)
      .attr("opacity", 1);

    const formatValue = (value) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else {
        // Show plain integer for values below 1000 (no suffix, no decimals)
        return Math.round(value).toString();
      }
    };
    const color = d3.scaleOrdinal().domain(ALL_BRANDS).range(COLORS);

    updateRef.current = function update() {
      const step = stepRef.current;
      const entry = SERIES[Math.min(step, SERIES.length - 1)];
      const { year, ...brands } = entry;
      let data = Object.entries(brands).map(([name, value]) => ({
        name,
        value,
      }));

      const maxVal = d3.max(data, (d) => d.value) || 0;
      const jitter = maxVal * 0.002;
      data.sort((a, b) => {
        const diff = b.value - a.value;
        if (Math.abs(diff) < jitter) {
          const ra = prevRanksRef.current.get(a.name) ?? N;
          const rb = prevRanksRef.current.get(b.name) ?? N;
          return ra - rb;
        }
        return diff;
      });
      data = data.slice(0, N).map((d, i) => ({ ...d, rank: i }));

      const topMax = d3.max(data, (d) => d.value) || 0;
      const targetMax = d3.scaleLinear().domain([0, topMax * 1.1]).nice().domain()[1];
      const curMax = currentXMaxRef.current;
      if (!curMax || Math.abs(targetMax - curMax) / curMax > 0.05) {
        currentXMaxRef.current = targetMax;
        x.domain([0, targetMax]);
        const axis = d3
          .axisTop(x)
          .ticks(innerWidth / 80)
          .tickSizeOuter(0)
          .tickFormat(formatValue);
        xAxisG.selectAll(".tick").transition().duration(150).attr("opacity", 0).remove();
        xAxisG
          .transition()
          .duration(TICK)
          .ease(d3.easeLinear)
          .call(axis);
        xAxisG
          .selectAll(".tick")
          .attr("opacity", 0)
          .transition()
          .duration(150)
          .attr("opacity", 1);
      }
      
      // Compute dynamic layout height to limit bar stretching when few bars
      const nBars = data.length;
      let layoutHeight = innerHeight;
      let offsetY = 0;
      if (limitBarStretch && nBars > 0) {
        const desired = nBars * maxBarHeight + (nBars - 1) * minBarGap;
        if (desired < innerHeight) {
          layoutHeight = desired;
          // Align bars to the top edge instead of centering
          offsetY = 0;
        }
      }
      y.range([0, layoutHeight]).domain(d3.range(nBars));

      // Align groups to the top (no vertical centering)
      barsG.attr("transform", `translate(0, 0)`);
      labelsG.attr("transform", `translate(0, 0)`);
      valuesG.attr("transform", `translate(0, 0)`);
      
      const t = g.transition().duration(TICK).ease(d3.easeLinear);

      const bars = barsG.selectAll("rect").data(data, (d) => d.name);
      bars
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("fill", (d) => color(d.name))
              .attr("height", y.bandwidth())
              .attr("x", 0)
              .attr("y", layoutHeight + y.bandwidth())
              .attr("width", 0)
              .attr("opacity", 0)
              .call((enter) =>
                enter
                  .transition(t)
                  .attr("y", (d) => y(d.rank))
                  .attr("opacity", 1)
              ),
          (update) => update,
          (exit) =>
            exit.call((exit) =>
              exit
                .transition(t)
                .attr("y", layoutHeight + y.bandwidth())
                .attr("opacity", 0)
                .remove()
            )
        )
        .attr("height", y.bandwidth())
        .transition(t)
        .attr("width", (d) => x(d.value))
        .attr("y", (d) => y(d.rank));

      barsG.selectAll("rect").sort((a, b) => d3.ascending(a.rank, b.rank));

      const labels = labelsG.selectAll("text").data(data, (d) => d.name);
      labels
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("x", -6)
              .attr("y", layoutHeight + y.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "end")
              .attr("opacity", 0)
              .text((d) => d.name)
              .call((enter) =>
                enter
                  .transition(t)
                  .attr("y", (d) => y(d.rank) + y.bandwidth() / 2)
                  .attr("opacity", 1)
              ),
          (update) => update,
          (exit) =>
            exit
              .transition(t)
              .attr("y", layoutHeight + y.bandwidth() / 2)
              .attr("opacity", 0)
              .remove()
        )
        .transition(t)
        .attr("y", (d) => y(d.rank) + y.bandwidth() / 2);

      labelsG.selectAll("text").sort((a, b) => d3.ascending(a.rank, b.rank));

      const values = valuesG.selectAll("text").data(data, (d) => d.name);
      values
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("y", layoutHeight + y.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("opacity", 0)
              .attr("data-value", (d) => d.value)
              .text((d) => formatValue(d.value))
              .call((enter) =>
                enter
                  .transition(t)
                  .attr("y", (d) => y(d.rank) + y.bandwidth() / 2)
                  .attr("opacity", 1)
              ),
          (update) => update,
          (exit) =>
            exit
              .transition(t)
              .attr("y", layoutHeight + y.bandwidth() / 2)
              .attr("opacity", 0)
              .remove()
        )
        .transition(t)
        .attr("y", (d) => y(d.rank) + y.bandwidth() / 2)
        .attr("x", (d) => {
          const w = x(d.value);
          return d.value < 1000000 ? w + 4 : w - 4;
        })
        .attr("text-anchor", (d) => (d.value < 1000000 ? "start" : "end"))
        .tween("text", function (d) {
          const currentValue = this.getAttribute("data-value") || 0;
          const i = d3.interpolateNumber(+currentValue, d.value);
          return function (t) {
            const interpolatedValue = i(t);
            this.textContent = formatValue(interpolatedValue);
            this.setAttribute("data-value", interpolatedValue);
          };
        });

      valuesG.selectAll("text").sort((a, b) => d3.ascending(a.rank, b.rank));

      yearLabel.text(year);

      prevRanksRef.current = new Map(data.map((d) => [d.name, d.rank]));
    };

    // Initial render is omitted so bars remain empty until animation starts
  }, []);

  const start = () => {
    if (timerRef.current) return;
    stepRef.current = 0;
    prevRanksRef.current = new Map();
    currentXMaxRef.current = 0;
    setIsRunning(true);
    setIsPaused(false);
    updateRef.current();
    timerRef.current = d3.interval(() => {
      stepRef.current += 1;
      if (stepRef.current >= SERIES.length) {
        timerRef.current.stop();
        timerRef.current = null;
        setIsRunning(false);
        setIsPaused(false);
      } else {
        updateRef.current();
      }
    }, TICK);
  };

  const pause = () => {
    if (timerRef.current && isRunning && !isPaused) {
      timerRef.current.stop();
      timerRef.current = null;
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (!timerRef.current && isRunning && isPaused) {
      setIsPaused(false);
      timerRef.current = d3.interval(() => {
        stepRef.current += 1;
        if (stepRef.current >= SERIES.length) {
          timerRef.current.stop();
          timerRef.current = null;
          setIsRunning(false);
          setIsPaused(false);
        } else {
          updateRef.current();
        }
      }, TICK);
    }
  };

  const rewind = (steps = 5) => {
    if (isRunning) {
      const newStep = Math.max(0, stepRef.current - steps);
      stepRef.current = newStep;
      updateRef.current();
    }
  };

  const stepBackward = () => rewind(1);
  const stepForward = () => {
    if (isRunning && isPaused && stepRef.current < SERIES.length - 1) {
      stepRef.current += 1;
      updateRef.current();
    }
  };

  useEffect(() => {
    return () => timerRef.current?.stop();
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
            <CardTitle>Динамика выпуска автоконцернов (за всё время)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={start}
                disabled={isRunning}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Старт
              </button>
              {isRunning && !isPaused && (
                <button
                  onClick={pause}
                  className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
                >
                  Пауза
                </button>
              )}
              {isRunning && isPaused && (
                <>
                  <button
                    onClick={() => rewind(5)}
                    disabled={stepRef.current === 0}
                    className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    ⏪ -5
                  </button>
                  <button
                    onClick={stepBackward}
                    disabled={stepRef.current === 0}
                    className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    ⏮ -1
                  </button>
                  <button
                    onClick={stepForward}
                    disabled={stepRef.current >= SERIES.length - 1}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    ⏭ +1
                  </button>
                  <button
                    onClick={resume}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    Продолжить
                  </button>
                </>
              )}
            </div>
            <div className="w-full relative" style={{ height: (typeof containerHeight === "number" ? `${containerHeight}px` : containerHeight) }}>
              <svg ref={svgRef} className="w-full h-full" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

