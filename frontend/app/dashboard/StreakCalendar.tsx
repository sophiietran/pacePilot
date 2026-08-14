"use client"
import React, { useEffect, useMemo, useState } from "react";

type StreakCalendarProps = {
    userId: string;
}

type CalendarData = {
  activeDates: string[];
  count: number;
};

export default function StreakCalendar({userId}: StreakCalendarProps){
    // current month
    const [displayMonth, setDisplayMonth] = useState(new Date());

    const year = displayMonth.getFullYear();
    const month = String(displayMonth.getMonth() + 1).padStart(2, "0");
    const monthParam = `${year}-${month}`;
    const monthLabel = displayMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    // for backend data
    const [data, setData] = useState<CalendarData | null>({
        activeDates: [],
        count: 0,
    });

    // call the calendar data fetch URL
    useEffect(() => {
        async function fetchStreakData() {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/streak/${userId}?month=${monthParam}`,
        );

        const json = await response.json();
        setData(json);
        }
        fetchStreakData();
    }, [userId, monthParam]);


    // calendar cells
    const calendarCells = useMemo(() => {
        // leading blank cells
        const leadingCells = new Date(year, displayMonth.getMonth(), 1).getDay();

        // days in the month -  get the next month, day 0 of next month is the last day of current month
        const daysinMonth = new Date(year, displayMonth.getMonth() + 1, 0).getDate();

        const cells: (string | null) [] = [];

        for (let i = 0; i < leadingCells; i++) // skip the leading cells
            cells.push(null);

        for (let d = 1; d <= daysinMonth; d++){
            const monthStr = String(displayMonth.getMonth() + 1).padStart(
              2,
              "0",
            );
            const dayStr = String(d).padStart(2, "0");
            cells.push(`${year}-${monthStr}-${dayStr}`);
        }

        return cells;
    }, [displayMonth, year]);


    // lookup for active days  - quicker than checking by data.activeDates.includes()
    const activeSet = useMemo(() => new Set(data?.activeDates ?? []), [data]);

    return (
      <div className="w-96 border border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">
        {/* header: month + streak count */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-white text-lg font-semibold">{monthLabel}</span>
          <span className="text-[#ff5912] font-bold">
            {data?.count} <span className="text-sm font-normal">weeks</span>
          </span>
        </div>

        {/* calendar */}
        <div>
          {/* weekday header row */}
          <div className="grid grid-cols-7 mb-2">
            {["Su", "M", "T", "W", "Th", "F", "Sa"].map((label) => (
              <span key={label} className="text-white/60 text-center text-xs">
                {label}
              </span>
            ))}
          </div>

          {/* day-cell grid */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={i} />; // blank padding cell

              const dayNum = cell.slice(-2).replace(/^0/, ""); // from 202-03-05 -> "05" -> "5"
              const isActive = activeSet.has(cell);

              // rendering actual cell
              return (
                <div
                  key={cell}
                  className="flex items-center justify-center h-8"
                >
                  {isActive ? (
                    <img
                      src="/streak-icon.svg"
                      alt="activity logged"
                      className="w-4 h-4"
                    />
                  ) : (
                    <span className="text-white text-sm">{dayNum}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
}