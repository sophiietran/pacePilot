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
  return (
    <header className="flex w-full bg-white shadow-md justify-between items-center px-5 py-2">

      {/* sync button */}
      <SyncButton userId={userId} />

      {/* title */}
      <span className="text-[#FC4C02] text-3xl font-bold">PacePilot</span>

      {/* profile pic and name */}
      <div className="flex items-center gap-3">
        <img
          src={profilepic}
          alt={`${firstname} ${lastname}`}
          className="rounded-full w-10 h-10"
        />
        <span className="text-[#FC4C02] text-lg font-bold">
          {firstname} {lastname}
        </span>
      </div>
    </header>
  );
}
