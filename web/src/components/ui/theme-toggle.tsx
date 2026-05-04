import {
  Monitor,
  Moon,
  Palette,
  Sun,
} from "@/components/nexus-icons";

import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type ThemeToggleProps = {
  className?: string;
};

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun className="size-4" />,
  dark: <Moon className="size-4" />,
  neon: <Palette className="size-4 text-cyan-400" />,
  matrix: <Palette className="size-4 text-green-500" />,
  molten: <Palette className="size-4 text-orange-500" />,
};

const THEME_LABELS: Record<Theme, string> = {
  light: "Светлая",
  dark: "Тёмная",
  neon: "Неон",
  matrix: "Матрица",
  molten: "Плавленая",
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
      <SelectTrigger
        aria-label="Выбор темы"
        className={cn(
          "size-9 p-0 text-foreground hover:text-foreground hover:bg-accent/20 cursor-pointer border bg-background shadow-xs relative flex items-center justify-center [&>svg:last-child]:hidden",
          className,
        )}
      >
        <span className="flex items-center justify-center">
          {THEME_ICONS[theme] ?? <Monitor className="size-4" />}
        </span>
        <span className="sr-only">{THEME_LABELS[theme]}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
          <SelectItem key={t} value={t}>
            {THEME_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
