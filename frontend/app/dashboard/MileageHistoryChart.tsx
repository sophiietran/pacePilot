"use client"

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type MileageHistoryProps = {
  userId: string;
};

type Range = "7d" | "1m" | "3m" | "6m" | "ytd";

const DAY_LABELS = ["Su", "M", "T", "W", "Th", "F", "Sa"]; // indexed by Date.getDay()
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// builds the last n calendar days (oldest -> today) as "YYYY-MM-DD" strings,
// so a chart always has a point for every day, even ones with no runs
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// finds the Monday of the current week, then walks back 7 days at a time
// until it passes daysBack, returning each Monday as "YYYY-MM-DD"
function getMondayTicks(daysBack: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = (dayOfWeek + 6) % 7; // days since most recent Monday
  const mostRecentMonday = new Date(today);
  mostRecentMonday.setDate(today.getDate() - diffToMonday);

  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - daysBack);

  const mondays: string[] = [];
  const cursor = new Date(mostRecentMonday);
  while (cursor >= cutoff) {
    mondays.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() - 7);
  }
  return mondays.reverse(); // oldest -> most recent
}

// period comes back from the backend as "YYYY-MM-DD"
function formatTick(period: string, range: Range): string {
  // period comes back from Postgres as a full ISO string (e.g. "2026-08-01T00:00:00.000Z"),
  // so grab just the date part before treating it as local time
  const date = new Date(`${period.slice(0, 10)}T00:00:00`);

  if (range === "7d") return DAY_LABELS[date.getDay()];
  if (range === "1m") return `${date.getMonth() + 1}/${date.getDate()}`;
  return MONTH_LABELS[date.getMonth()]; // 3m, 6m, ytd
}

export default function MileageHistoryChart({ userId }: MileageHistoryProps){

    const [range, setRange] = useState<Range>("1m"); // for button
    const [data, setData] = useState<{ period: string; distance: number }[]>(
      [],
    );// for data backend returns

    // fetches data based on range chosen
    useEffect(() => {
        async function fetchHistory(){
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/mileageHistory/${userId}?range=${range}`,
            );

            const json = await response.json();
            setData(json);
        }
        fetchHistory();
    }, [userId, range]);


    // convert meters to miles
    const rawChartData = data.map((point) => ({
      period: point.period,
      miles: point.distance / 1609.34,
    }));

    // for 7d/1m, fill in any missing days with 0 miles so every day is represented
    const daysToFill = range === "7d" ? 7 : range === "1m" ? 30 : 0;
    const chartData = daysToFill
      ? getLastNDays(daysToFill).map((day) => {
          const match = rawChartData.find((p: { period: string }) => p.period.slice(0, 10) === day);
          return { period: day, miles: match ? match.miles : 0 };
        })
      : rawChartData;

    // which x-axis ticks to actually show, depending on range
    const ticks = useMemo(() => {
      if (range === "7d") {
        return chartData.map((p: { period: string }) => p.period); // every day
      }
      if (range === "1m") {
        // Monday of this week, and every Monday going back a month
        return getMondayTicks(30);
      }
      // 3m, 6m, ytd -> one tick per distinct month
      const seenMonths = new Set<string>();
      return chartData
        .filter((p: { period: string }) => {
          const month = p.period.slice(0, 7); // "YYYY-MM"
          if (seenMonths.has(month)) return false;
          seenMonths.add(month);
          return true;
        })
        .map((p: { period: string }) => p.period);
    }, [chartData, range]);

    // y-axis: pick a "nice" step (1, 2, 5, 10, 20, 25, 50...) so ticks land on
    // clean, evenly-spaced numbers instead of arbitrary fractions of the max
    const maxMiles = Math.max(0, ...chartData.map((p) => p.miles));
    const roundedMax = Math.max(1, Math.ceil(maxMiles));
    const targetTicks = 5;

    const rawStep = roundedMax / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;
    let niceStep;
    if (normalizedStep > 5) niceStep = 10 * magnitude;
    else if (normalizedStep > 2) niceStep = 5 * magnitude;
    else if (normalizedStep > 1) niceStep = 2 * magnitude;
    else niceStep = magnitude;

    const yAxisMax = Math.ceil(roundedMax / niceStep) * niceStep;
    const yAxisTicks = Array.from(
      { length: yAxisMax / niceStep + 1 },
      (_, i) => i * niceStep,
    );

    // range selector buttons
    const ranges: { label: string; value: typeof range }[] = [
      { label: "7D", value: "7d" },
      { label: "1M", value: "1m" },
      { label: "3M", value: "3m" },
      { label: "6M", value: "6m" },
      { label: "YTD", value: "ytd" },
    ];

    return (
      <div className="border border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">
        {/* line graph */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#ffffff33" />
            <XAxis
              dataKey="period"
              ticks={ticks}
              tickFormatter={(value) => formatTick(value, range)}
              tick={{ fill: "#ffffff" }}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yAxisMax]}
              ticks={yAxisTicks}
              tick={{ fill: "#ffffff" }}
              width={30}
            />
            <Area
              type="linear"
              dataKey="miles"
              stroke="#FC4C02"
              strokeWidth={2}
              fill="#FC4C02"
              fillOpacity={0.2}
              dot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* buttons */}
        <div className="flex justify-center gap-2 mt-3">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-sm rounded-2xl cursor-pointer ${
                range === r.value ? "bg-[#FC4C02] text-white" : "bg-white/20 text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }