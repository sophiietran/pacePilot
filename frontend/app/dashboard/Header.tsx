"use client";

import { useEffect, useRef, useState } from "react";
import SyncButton from "./SyncButton";

type HeaderProps = {
  firstname: string;
  lastname: string;
  profilepic: string;
  userId: string;
};

export default function Header({
  firstname,
  lastname,
  profilepic,
  userId,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // once the user scrolls past the header's own height, fade it out
  // so it doesn't stay a harsh solid-orange banner the whole way down
  useEffect(() => {
    const headerHeight = headerRef.current?.offsetHeight ?? 0;

    function handleScroll() {
      setIsScrolled(window.scrollY > headerHeight);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className="z-10 flex w-full justify-between items-center px-5 py-1.5 sticky top-0 bg-[#ff5912]"
      
    >
      {/* sync button */}
      <SyncButton userId={userId} />

      {/* title */}
      <span className="text-white text-2xl font-bold">PacePilot</span>

      {/* profile pic and name */}
      <div className="flex items-center gap-3">
        <img
          src={profilepic}
          alt={`${firstname} ${lastname}`}
          className="rounded-xl w-10 h-10"
        />
        <span className="text-white text-lg font-bold">
          {firstname} {lastname}
        </span>
      </div>
    </header>
  );
}
