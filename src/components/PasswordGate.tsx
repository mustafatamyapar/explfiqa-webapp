import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "explfiqa_auth";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_APP_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthenticated(true);
    } else {
      setError(true);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 text-center px-4"
      >
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Times New Roman', 'DejaVu Serif', Georgia, serif" }}
        >
          EXPL-FIQA Explorer
        </h1>
        <p className="text-sm text-muted-foreground">
          This tool is restricted. Enter the access code to continue.
        </p>
        <Input
          type="password"
          placeholder="Access code"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPassword(e.target.value);
            setError(false);
          }}
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-600">Incorrect access code.</p>
        )}
        <Button type="submit" className="w-full">
          Enter
        </Button>
      </form>
    </div>
  );
}
