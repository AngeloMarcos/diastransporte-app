import logoAsset from "@/assets/dias-transporte-logo.png";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset}
        alt="Dias Transporte"
        className="h-9 w-9 rounded-md object-contain bg-black p-0.5"
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">Dias Transporte</div>
          <div className="text-[10px] uppercase text-muted-foreground">Central de Transfers</div>
        </div>
      )}
    </div>
  );
}