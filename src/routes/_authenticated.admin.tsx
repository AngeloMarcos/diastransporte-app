import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { obterMeuPapel, sairSessao } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, Building2, Radio, Car, ClipboardList } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    obterMeuPapel().then(({ role }) => {
      if (role !== "admin") {
        navigate({ to: role === "motorista" ? "/motorista" : "/auth", replace: true });
      } else {
        setChecked(true);
      }
    });
  }, [navigate]);

  async function logout() {
    await sairSessao();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  if (!checked) {
    return <div className="p-8 text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-56 border-r bg-background p-4 flex flex-col">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="mb-3 text-xs text-muted-foreground">Painel Admin</div>
        <nav className="flex flex-col gap-1 text-sm">
          <NavItem to="/admin" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem to="/admin/pedidos" icon={<ClipboardList size={16} />} label="Pedidos" />
          <NavItem to="/admin/motoristas" icon={<Users size={16} />} label="Motoristas" />
          <NavItem to="/admin/empresas" icon={<Building2 size={16} />} label="Empresas" />
          <NavItem to="/admin/canais" icon={<Radio size={16} />} label="Canais de venda" />
          <NavItem to="/admin/categorias" icon={<Car size={16} />} label="Categorias" />
        </nav>
        <div className="mt-auto pt-4">
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut size={14} className="mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to as any}
      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
      activeOptions={{ exact: to === "/admin" }}
    >
      {icon} {label}
    </Link>
  );
}