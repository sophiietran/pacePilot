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
      { key: "mile", label: "1 Mile" },
      { key: "fiveK", label: "5K" },
      { key: "tenK", label: "10K" },
      { key: "half", label: "Half" },
      { key: "full", label: "Full" },
    ];

    return (
      <div className="border text-white border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">
        {CATEGORY_LABELS.map(({ key, label }) => {
          const entry = data?.[key];

          return (
            <div key={key} className="flex flex-col items-center">
              <span className="font-bold text-xl">{label}</span>

              <div className="flex gap-3">
                {entry ? (
                  <>
                    <span>{entry.time}</span>
                    <span>{entry.pace}</span>
                  </>
                ) : (
                  <span>--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
}
