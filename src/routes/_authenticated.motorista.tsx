import { createFileRoute, Outlet, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { obterMeuPapel, sairSessao } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Search, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/motorista")({
  ssr: false,
  component: MotoristaLayout,
});

function MotoristaLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    obterMeuPapel().then(({ role }) => {
      if (role !== "motorista") {
        navigate({ to: role === "admin" ? "/admin" : "/auth", replace: true });
      } else setOk(true);
    });
  }, [navigate]);

  async function logout() {
    await sairSessao();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  if (!ok) return <div className="p-8 text-sm text-muted-foreground">Verificando acesso…</div>;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}><LogOut size={14} className="mr-2" />Sair</Button>
        </div>
      </header>
      <main className="p-4"><Outlet /></main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background grid grid-cols-3 text-xs">
        <TabLink to="/motorista" icon={<LayoutDashboard size={16} />} label="Início" exact />
        <TabLink to="/motorista/pedidos" icon={<Search size={16} />} label="Pesquisar" />
        <TabLink to="/motorista/perfil" icon={<User size={16} />} label="Perfil" />
      </nav>
    </div>
  );
}

function TabLink({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <Link to={to as any} activeOptions={{ exact }}
      className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground [&.active]:text-foreground [&.active]:font-medium">
      {icon}{label}
    </Link>
  );
}