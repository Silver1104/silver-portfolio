
import Link from "next/link";

export function Titlebgcontent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-white bg-[#1F1F1F]">
      <div className="container flex flex-col items-center justify-center gap-1 px-4 py-16 mb-20">
        <img
          src="/resources/cover_page_bg.png"
          alt="Cover page BG"
          className="inset-0 w-160 object-cover opacity-100 "
        />
        <p className="font-bold text-2xl tracking-wider opacity-70 pb-4">More than design</p>
      </div>
    </main>
  );
}
