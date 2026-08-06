"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncButtonProps = {
  userId: string;
};

export default function SyncButton({ userId }: SyncButtonProps){

    const router = useRouter();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);

        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/data/${userId}/sync`,
           { method: "POST", });

        router.refresh();
        setIsSyncing(false);
    };

    return (
      <button
        className="rounded-sm text-[#FC4C02] border font-semibold px-3 py-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? "Syncing..." : "Sync Data"}
      </button>
    );
}
