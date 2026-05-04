import React from "react";

// Keep LucideIcon type for backward compatibility (used in chain-of-thought.tsx)
import type { LucideIcon } from "lucide-react";
export type { LucideIcon };

// ═══════════════════════════════════════════════════════════════════════════════
//  NEXUS STATION — Full Phosphor Icons migration
//  Every icon replaced with context-matched Phosphor equivalent
// ═══════════════════════════════════════════════════════════════════════════════
import {
  Alien,
  AppWindow,
  Archive,
  ArrowBendDownLeft,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  ArrowsIn,
  ArrowsInLineVertical,
  ArrowsOut,
  ArrowsOutLineVertical,
  ArrowSquareOut,
  ArrowUp,
  BookOpen,
  Brain,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChatTeardropText,
  Check,
  CheckCircle,
  CheckSquare,
  Circle,
  CircleDashed,
  ClockCounterClockwise,
  Code,
  Copy,
  Cpu,
  Dot,
  DotsSixVertical,
  Download,
  Envelope,
  Eye,
  EyeSlash,
  File,
  FileCode,
  FileMagnifyingGlass,
  FileText,
  FlowArrow,
  Folder,
  FolderOpen,
  Gear,
  GitBranch,
  Globe,
  House,
  Image,
  ImageBroken,
  Info,
  Key,
  Link,
  List,
  ListChecks,
  ListNumbers,
  MagnifyingGlass,
  Meteor,
  Microphone,
  Minus,
  Monitor,
  Moon,
  MoonStars,
  NotePencil,
  Palette,
  Paperclip,
  Pencil,
  PencilSimpleLine,
  Planet,
  Plug,
  Plus,
  PuzzlePiece,
  Record,
  Robot,
  Rocket,
  RocketLaunch,
  Shield,
  ShootingStar,
  Sidebar,
  SidebarSimple,
  Sparkle,
  Spinner,
  Square,
  Star,
  Sun,
  Terminal,
  TerminalWindow,
  Trash,
  TreeStructure,
  User,
  VideoCamera,
  Warning,
  WarningCircle,
  Wrench,
  X,
} from "@phosphor-icons/react";

export const NEXUSLogo = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 64 64" width="32" height="32" {...props}>
      <defs>
        <linearGradient id="nexusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#b829dd" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#nexusGrad)" strokeWidth="1.5" opacity="0.4" style={{ animation: "nexus-spin 8s linear infinite" }} />
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#nexusGrad)" strokeWidth="1" opacity="0.2" style={{ animation: "nexus-spin 12s linear infinite reverse" }} />
      <text x="32" y="44" textAnchor="middle" fontFamily="'Press Start 2P', monospace" fontSize="28" fontWeight="bold" fill="url(#nexusGrad)" style={{ animation: "nexus-glow 2s ease-in-out infinite alternate" }}>N</text>
    </svg>
  )
);
NEXUSLogo.displayName = "NEXUSLogo";

// ─── Standard icons (direct Phosphor equivalents) ─────────────────────────────

export { WarningCircle as AlertCircle };
export { WarningCircle as AlertCircleIcon };
export { Warning as AlertTriangle };
export { Warning as AlertTriangleIcon };
export { AppWindow as AppWindowIcon };
export { Archive };
export { ArrowsCounterClockwise as ArchiveRestore };
export { ArrowDown as ArrowDownIcon };
export { ArrowLeft };
export { ArrowRight };
export { ArrowRight as ArrowRightIcon };
export { ArrowUp };
export { ArrowUp as ArrowUpIcon };
export { BookOpen };
export { Brain as BrainIcon };
export { ChatTeardropText as MessageSquare };
export { Check };
export { CheckCircle };
export { CheckCircle as CheckCircle2 };
export { CheckCircle as CheckCircle2Icon };
export { Check as CheckIcon };
export { CheckSquare };
export { CheckSquare as CheckSquare2Icon };
export { CaretDown as ChevronDown };
export { CaretDown as ChevronDownIcon };
export { CaretLeft as ChevronLeftIcon };
export { CaretRight as ChevronRightIcon };
export { CaretUp as ChevronUpIcon };
export { ArrowsInLineVertical as ChevronsDownUpIcon };
export { ArrowsOutLineVertical as ChevronsUpDown };
export { ArrowsOutLineVertical as ChevronsUpDownIcon };
export { CheckCircle as CircleCheckIcon };
export { CircleDashed as CircleDashedIcon };
export { Record as CircleDotIcon };
export { Circle as CircleIcon };
export { Code as CodeIcon };
export { Copy };
export { Copy as CopyIcon };
export { ArrowBendDownLeft as CornerDownLeftIcon };
export { Cpu };
export { Dot as DotIcon };
export { Download as DownloadIcon };
export { ArrowSquareOut as ExternalLink };
export { ArrowSquareOut as ExternalLinkIcon };
export { Eye };
export { EyeSlash };
export { FileCode };
export { File as FileIcon };
export { NotePencil as FilePenIcon };
export { FileText };
export { FileText as FileTextIcon };
export { FileMagnifyingGlass as FolderSearchIcon };
export { GitBranch as GitBranchIcon };
export { Globe as GlobeIcon };
export { DotsSixVertical as GripVerticalIcon };
export { ClockCounterClockwise as HistoryIcon };
export { Image as ImageIcon };
export { ImageBroken as ImageOffIcon };
export { Info };
export { Info as InfoIcon };
export { Key };
export { Link as LinkIcon };
export { List };
export { ListChecks as ListChecksIcon };
export { ListNumbers as ListOrderedIcon };
export { Envelope as MailIcon };
export { ArrowsOut as Maximize2Icon };
export { Microphone as MicIcon };
export { ArrowsIn as Minimize2Icon };
export { Minus as MinusIcon };
export { Monitor };
export { Moon };
export { Palette };
export { SidebarSimple as PanelLeftClose };
export { Sidebar as PanelLeftOpen };
export { SidebarSimple as PanelRightClose };
export { SidebarSimple as PanelRightCloseIcon };
export { Sidebar as PanelRightOpen };
export { Paperclip };
export { Paperclip as PaperclipIcon };
export { Pencil };
export { Pencil as PencilIcon };
export { Plug };
export { Plus };
export { Plus as PlusIcon };
export { PuzzlePiece as Puzzle };
export { ArrowsClockwise as RefreshCcw };
export { ArrowsClockwise as RefreshCw };
export { ArrowsClockwise as RefreshCwIcon };
export { MagnifyingGlass as Search };
export { MagnifyingGlass as SearchIcon };
export { Gear as Settings };
export { Shield };
export { Sidebar };
export { SidebarSimple };
export { Sparkle as Sparkles };
export { Sparkle as SparklesIcon };
export { Square };
export { Square as SquareIcon };
export { Sun };
export { Trash as Trash2 };
export { Trash as Trash2Icon };
export { User };
export { User as UserIcon };
export { VideoCamera as VideoIcon };
export { FlowArrow as WorkflowIcon };
export { Wrench as WrenchIcon };
export { X };
export { X as XIcon };

// ─── Cosmic aliases (file manager & terminal theming) ─────────────────────────

/** 🪐 File manager — planetary system */
export { Planet as Folder };
export { Planet as FolderIcon };
export { Planet as FolderOpen };
export { Planet as FolderOpenIcon };

/** 🌟 File tree — stellar map */
export { ShootingStar as FolderTree };

/** 🚀 Terminal — rocket launch */
export { RocketLaunch as Terminal };
export { RocketLaunch as TerminalIcon };
export { Rocket as TerminalSquare };
export { Rocket as TerminalSquareIcon };
export { RocketLaunch as SquareTerminalIcon };

// ─── Bonus cosmic icons (available for future use) ────────────────────────────
export { Alien as AlienIcon };
export { Meteor as MeteorIcon };
export { Star as StarIcon };
export { Rocket as RocketIcon };
export { RocketLaunch as RocketLaunchIcon };
export { MoonStars as MoonStarsIcon };
export { Planet as PlanetIcon };
export { ShootingStar as ShootingStarIcon };
export { Robot as BotIcon };
export { House as Home };
export { Spinner as Loader2 };
export { Spinner as Loader2Icon };
