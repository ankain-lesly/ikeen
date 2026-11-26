import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <div className="flex-1 flex flex-col">{children}</div>
      <PublicFooter />
    </div>
  );
}
