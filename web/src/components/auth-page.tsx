import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setAuthToken } from "@/lib/auth";
import { Eye, EyeSlash, Shield, User, Key, Copy, CheckCircle } from "@/components/nexus-icons";

type AuthMode = "loading" | "setup" | "login" | "authed";

export function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<AuthMode>("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setMode(data.configured ? "login" : "setup");
      })
      .catch(() => {
        toast.error("Не удалось проверить статус авторизации");
        setMode("login");
      });
  }, []);

  const handleSetup = async () => {
    if (!username.trim() || username.length < 3) {
      toast.error("Логин минимум 3 символа");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль минимум 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setAuthToken(data.token);
        setMode("authed");
        toast.success("Аккаунт создан", { description: `Пользователь: ${data.username}` });
      } else {
        toast.error("Ошибка", { description: data.detail || "Не удалось создать аккаунт" });
      }
    } catch (e: any) {
      toast.error("Ошибка сети", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      toast.error("Введите логин и пароль");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setAuthToken(data.token);
        setMode("authed");
        toast.success("Вход выполнен", { description: `Добро пожаловать, ${data.username}` });
      } else {
        toast.error("Ошибка входа", { description: data.detail || "Неверный логин или пароль" });
      }
    } catch (e: any) {
      toast.error("Ошибка сети", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Токен скопирован");
  };

  const continueToApp = () => {
    onAuth();
  };

  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <Shield className="size-8 mx-auto text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="size-6 text-primary" />
            <h1 className="text-xl font-bold">NEXUS Station</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "setup" ? "Создайте первого пользователя" : "Войдите в аккаунт"}
          </p>
        </div>

        {/* Setup / Login Form */}
        {mode !== "authed" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User className="size-3.5" /> Логин
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    mode === "setup" ? handleSetup() : handleLogin();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Key className="size-3.5" /> Пароль
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      mode === "setup" ? handleSetup() : handleLogin();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "setup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Key className="size-3.5" /> Подтвердите пароль
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSetup();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={mode === "setup" ? handleSetup : handleLogin}
              disabled={loading}
            >
              {loading
                ? "Загрузка..."
                : mode === "setup"
                  ? "Создать аккаунт"
                  : "Войти"}
            </Button>

            {mode === "login" && (
              <p className="text-xs text-muted-foreground text-center">
                Если вы забыли пароль — удалите файл <code>~/.nexus/web_users.json</code> на сервере и перезапустите приложение.
              </p>
            )}
          </div>
        )}

        {/* Authed — show token */}
        {mode === "authed" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-500" />
                <h3 className="font-medium">Готово</h3>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Ваш API токен (сохраните его):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all font-mono">
                    {token}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyToken} className="shrink-0">
                    {copied ? <CheckCircle className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Токен сохранён в браузере на 30 дней. Вы также можете входить по ссылке:
                <br />
                <code className="text-[10px]">
                  {typeof window !== "undefined" ? window.location.origin : ""}/?token=...
                </code>
              </p>
            </div>

            <Button className="w-full" onClick={continueToApp}>
              Продолжить в NEXUS Station
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
