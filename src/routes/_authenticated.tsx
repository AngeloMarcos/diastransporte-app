import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessaoAtiva } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!(await sessaoAtiva())) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});