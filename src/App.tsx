import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransparencyPage } from "@/pages/TransparencyPage";
import { ComparisonPage } from "@/pages/ComparisonPage";
import { PasswordGate } from "@/components/PasswordGate";
import { preCheckServer } from "@/lib/api";

// Pre-check HF Space on app load so we know immediately if we need demo mode
preCheckServer();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              EXPL-FIQA Explorer
            </h1>
            <p className="text-xs text-muted-foreground">
              Explainable Face Image Quality Assessment
            </p>
          </div>
          <nav>
            <Tabs defaultValue="transparency">
              <TabsList>
                <NavLink to="/">
                  {({ isActive }) => (
                    <TabsTrigger
                      value="transparency"
                      data-state={isActive ? "active" : "inactive"}
                    >
                      Transparency
                    </TabsTrigger>
                  )}
                </NavLink>
                <NavLink to="/comparison">
                  {({ isActive }) => (
                    <TabsTrigger
                      value="comparison"
                      data-state={isActive ? "active" : "inactive"}
                    >
                      Comparison
                    </TabsTrigger>
                  )}
                </NavLink>
              </TabsList>
            </Tabs>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <PasswordGate>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<TransparencyPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </PasswordGate>
  );
}
