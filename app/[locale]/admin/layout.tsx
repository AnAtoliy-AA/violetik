import { TabBar } from "@/widgets/tab-bar";

// Mounts the bottom <TabBar /> with the Admin pill on every nested
// admin route. Access control still happens per-page via
// requireAdmin(); non-admins are redirected before this layout's
// children render, so passing showAdmin unconditionally is safe.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-28">
      {children}
      <TabBar showAdmin />
    </div>
  );
}
