import Link from "next/link";

export function TitlepageContent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-white select-none overflow-hidden">
      <div className="container flex flex-col w-160 items-center justify-center gap-1 px-4 py-16 mb-20">
        <h1 className="font-extrabold text-5xl tracking-tight sm:text-[5rem] opacity-70">
          Raghav Poddar
        </h1>
        <p className="font-bold text-2xl tracking-wider opacity-70">More than development</p>
      </div>
    </main>
  );
}
