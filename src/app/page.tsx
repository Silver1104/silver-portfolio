import { CursorRevealOverlay } from "~/app/_components/cursor-overlay";
import { HydrateClient, api } from "~/trpc/server";
import { Titlebgcontent } from "./title/TitleBgPage";
import { TitlepageContent } from "./title/TitlePage";
import Link from "next/link";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <div className="min-h-screen">
        <CursorRevealOverlay 
          underLayer={<Titlebgcontent />}
        >
          <TitlepageContent />
        </CursorRevealOverlay>
        <Link
          className="fixed bottom-60 left-1/2 transform -translate-x-1/2 flex max-w-xs flex-col gap-4 items-center rounded-xl bg-white/10 p-4 hover:bg-white/20 transition-all duration-200 w-250 h-20 justify-center z-50"
          href="/portfolio"
        >
          <h3 className="font-bold text-3xl text-white">Portfolio ^_^</h3>
        </Link>
      </div>
    </HydrateClient>
  );
}
