import { nexusVersion } from "@/lib/version";
import { cn } from "@/lib/utils";

type NexusStationBrandProps = {
  className?: string;
  size?: "sm" | "md";
  showVersion?: boolean;
  version?: string;
};

export function NexusStationBrand({
  className,
  size = "md",
  showVersion = true,
  version,
}: NexusStationBrandProps) {
  const textSizeClass = size === "sm" ? "text-base" : "text-lg";
  const versionPadding = size === "sm" ? "text-xs" : "text-sm";
  const logoSize = size === "sm" ? "size-6" : "size-7";
  const logoPx = size === "sm" ? 24 : 28;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <a
        href="https://github.com/adden-git/NEXT"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src="/logo.svg"
          alt="NEXUS"
          width={logoPx}
          height={logoPx}
          className={cn(logoSize, "logo-animate")}
        />
        <span className={cn(textSizeClass, "font-semibold text-foreground")}>
          NEXUS Station
        </span>
      </a>
      {showVersion && (
        <span
          className={cn("text-muted-foreground font-medium", versionPadding)}
        >
          {version || nexusVersion}
        </span>
      )}
    </div>
  );
}
