import { r as reactExports, j as jsxRuntimeExports, L as LoaderCircle, F as FolderOpen, H as House } from "./vendor-ui-BxtH5Rrc.js";
import { C as CommandDialog, a as Command, b as CommandInput, c as CommandList, d as CommandEmpty, e as CommandGroup, f as CommandItem, g as CommandSeparator, T as Tooltip, h as TooltipTrigger, i as TooltipContent, A as AlertDialog, j as AlertDialogContent, k as AlertDialogHeader, l as AlertDialogTitle, m as AlertDialogDescription, n as AlertDialogFooter, o as AlertDialogCancel, p as AlertDialogAction } from "./bootstrap-CB-BLuGw.js";
import "./vendor-chat-Du60ez_-.js";
import "./vendor-heavy-BkHv3LKv.js";
const HOME_DIR_REGEX = /^(\/Users\/[^/]+|\/home\/[^/]+)/;
const TRAILING_SLASH_REGEX = /\/$/;
function formatPathForDisplay(path, maxSegments = 3) {
  const homeMatch = path.match(HOME_DIR_REGEX);
  let displayPath = path;
  if (homeMatch) {
    displayPath = `~${path.slice(homeMatch[1].length)}`;
  }
  const segments = displayPath.split("/").filter(Boolean);
  if (segments.length <= maxSegments) {
    return displayPath.startsWith("~") ? displayPath : `/${segments.join("/")}`;
  }
  const prefix = displayPath.startsWith("~") ? "~" : "";
  const lastSegments = segments.slice(-2).join("/");
  return `${prefix}/.../${lastSegments}`;
}
let cachedWorkDirs = null;
function CreateSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  fetchWorkDirs,
  fetchStartupDir
}) {
  const [workDirs, setWorkDirs] = reactExports.useState(
    () => cachedWorkDirs ?? []
  );
  const [inputValue, setInputValue] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isCreating, setIsCreating] = reactExports.useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = reactExports.useState(false);
  const [pendingPath, setPendingPath] = reactExports.useState("");
  const [startupDir, setStartupDir] = reactExports.useState("");
  const [commandValue, setCommandValue] = reactExports.useState("");
  const isCreatingRef = reactExports.useRef(false);
  const commandListRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) {
      return;
    }
    if (cachedWorkDirs) {
      setWorkDirs(cachedWorkDirs);
    } else {
      setIsLoading(true);
    }
    fetchStartupDir().then((startup) => {
      if (startup) {
        setStartupDir(startup);
        setCommandValue(startup);
      }
    }).catch(() => {
    });
    fetchWorkDirs().then((dirs) => {
      cachedWorkDirs = dirs;
      setWorkDirs(dirs);
    }).catch((error) => {
      console.error("Failed to fetch directories:", error);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [open, fetchWorkDirs, fetchStartupDir]);
  reactExports.useEffect(() => {
    if (!open) {
      setInputValue("");
      setCommandValue("");
      setWorkDirs(cachedWorkDirs ?? []);
      setIsCreating(false);
      setShowConfirmCreate(false);
      setPendingPath("");
      setStartupDir("");
      isCreatingRef.current = false;
    }
  }, [open]);
  const handleSelect = reactExports.useCallback(
    async (dir) => {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;
      setIsCreating(true);
      try {
        await onConfirm(dir);
        onOpenChange(false);
      } catch (err) {
        if (err instanceof Error && "isDirectoryNotFound" in err && err.isDirectoryNotFound) {
          setPendingPath(dir);
          setShowConfirmCreate(true);
        }
      } finally {
        setIsCreating(false);
        isCreatingRef.current = false;
      }
    },
    [onConfirm, onOpenChange]
  );
  const handleInputSubmit = reactExports.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isCreatingRef.current) return;
    handleSelect(trimmed);
  }, [inputValue, handleSelect]);
  const handleConfirmCreateDir = reactExports.useCallback(async () => {
    if (!pendingPath) {
      return;
    }
    setShowConfirmCreate(false);
    setIsCreating(true);
    isCreatingRef.current = true;
    try {
      await onConfirm(pendingPath, true);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create directory:", err);
    } finally {
      setIsCreating(false);
      isCreatingRef.current = false;
      setPendingPath("");
    }
  }, [pendingPath, onConfirm, onOpenChange]);
  const handleCancelCreateDir = reactExports.useCallback(() => {
    setShowConfirmCreate(false);
    setPendingPath("");
  }, []);
  const handleKeyDown = reactExports.useCallback(
    (e) => {
      if (e.key !== "Tab" || !commandListRef.current) return;
      const selectedItem = commandListRef.current.querySelector(
        "[cmdk-item][data-selected=true]"
      );
      if (!selectedItem) return;
      const value = selectedItem.getAttribute("data-value");
      if (!value || value.startsWith("__custom__")) return;
      e.preventDefault();
      setInputValue(value);
    },
    []
  );
  const trimmedInput = inputValue.trim();
  const inputMatchesExisting = trimmedInput !== "" && workDirs.some(
    (dir) => dir === trimmedInput || dir === trimmedInput.replace(TRAILING_SLASH_REGEX, "")
  );
  const showCustomPathOption = trimmedInput !== "" && !inputMatchesExisting;
  const recentDirs = reactExports.useMemo(
    () => startupDir ? workDirs.filter((d) => d !== startupDir) : workDirs,
    [workDirs, startupDir]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CommandDialog,
      {
        open,
        onOpenChange,
        title: "Новая сессия",
        description: "Выберите папку или введите новый путь",
        showCloseButton: false,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Command, { value: commandValue, onValueChange: setCommandValue, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CommandInput,
            {
              placeholder: "Поиск папок или ввод пути...",
              value: inputValue,
              onValueChange: setInputValue,
              onKeyDown: handleKeyDown
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandList, { ref: commandListRef, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CommandEmpty, { children: trimmedInput ? "Нет совпадений." : isLoading ? "Загрузка папок..." : "Введите путь для новой сессии." }),
            showCustomPathOption && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Свой путь", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CommandItem,
                {
                  className: "group",
                  value: `__custom__${trimmedInput}`,
                  onSelect: handleInputSubmit,
                  disabled: isCreating,
                  children: [
                    isCreating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, {}),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate", children: trimmedInput }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "pointer-events-none ml-auto hidden select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-data-[selected=true]:inline-flex", children: "↵" })
                  ]
                }
              ) }),
              (startupDir || recentDirs.length > 0 || isLoading) && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandSeparator, {})
            ] }),
            startupDir && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Текущая папка", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                CommandItem,
                {
                  className: "group",
                  value: startupDir,
                  onSelect: () => handleSelect(startupDir),
                  disabled: isCreating,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(House, {}),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: formatPathForDisplay(startupDir, 3) }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "right", children: startupDir })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "pointer-events-none ml-auto hidden select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-data-[selected=true]:inline-flex", children: "↵" })
                  ]
                }
              ) }),
              (recentDirs.length > 0 || isLoading) && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandSeparator, {})
            ] }),
            recentDirs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { heading: "Недавние папки", children: recentDirs.map((dir) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              CommandItem,
              {
                className: "group",
                value: dir,
                onSelect: () => handleSelect(dir),
                disabled: isCreating,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, {}),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: formatPathForDisplay(dir, 3) }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "right", children: dir })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "pointer-events-none ml-auto hidden select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-data-[selected=true]:inline-flex", children: "↵" })
                ]
              },
              dir
            )) }),
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin text-muted-foreground" }) })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: showConfirmCreate, onOpenChange: setShowConfirmCreate, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Папка не найдена" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogDescription, { children: [
          "Папка",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "bg-muted px-1 py-0.5 rounded text-foreground break-all", children: pendingPath }),
          " ",
          "не существует. Создать её?"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { onClick: handleCancelCreateDir, children: "Отмена" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { onClick: handleConfirmCreateDir, children: "Создать папку" })
      ] })
    ] }) })
  ] });
}
export {
  CreateSessionDialog,
  CreateSessionDialog as default
};
