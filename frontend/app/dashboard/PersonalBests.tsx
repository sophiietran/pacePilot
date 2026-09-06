"use client"
import React, { useEffect, useState } from "react";

type PersonalBestsProps = {
    userId: string;
}

// what backend returns
type BestEntry = { time: string; pace: string } | null;

type PersonalBestsData = {
  mile: BestEntry;
  fiveK: BestEntry;
  tenK: BestEntry;
  half: BestEntry;
  full: BestEntry;
};


export default function PersonalBests({userId}: PersonalBestsProps){

    const [ data, setData ] = useState<PersonalBestsData | null>({
            mile: null,
            fiveK: null,
            tenK: null,
            half: null,
            full: null,
        });

    // call the PR fetch URL to get data
    useEffect(() => {
        async function fetchPRData() {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/personalBests/${userId}`,
        );

        const json = await response.json();
        setData(json);
        }
        fetchPRData();
    }, [userId]);

    // display labels:
    const CATEGORY_LABELS: { key: keyof PersonalBestsData; label: string }[] = [
      { key: "mile", label: "1mi" },
      { key: "fiveK", label: "5k" },
      { key: "tenK", label: "10k" },
      { key: "half", label: "Half" },
      { key: "full", label: "Full" },
    ];

    return (
      <div className="w-md border text-white border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">

        <h1 className="font-bold text-lg text-center mb-4">Personal Bests</h1>

        <div className="grid grid-cols-5">
          {CATEGORY_LABELS.map(({ key, label }) => {
            const entry = data?.[key];

            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="font-semibold text-sm text-white/60">{label}</span>
                <span className="font-bold text-sm">{entry ? entry.time : "--"}</span>
                <span className="text-xs text-white/60">{entry ? entry.pace : "--"}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
}
