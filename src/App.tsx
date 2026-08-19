import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfirmDialogProvider } from "@/hooks/useConfirmDialog";
import { AuthProvider } from "@/hooks/useAuth";
import PageLoader from "@/components/PageLoader";

const Index = lazy(() => import("./pages/Index"));
const Library = lazy(() => import("./pages/Library"));
const Theater = lazy(() => import("./pages/Theater"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GameLanding = lazy(() => import("./pages/GameLanding"));

// Production/web builds ship the theater only: "/" is a public games
// landing page and the editor routes are not registered. The editor
// exists only in local dev (npm run dev).
const isDev = import.meta.env.DEV;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={isDev ? <Index /> : <GameLanding />} />
                {isDev && <Route path="/auth" element={<Auth />} />}
                {isDev && <Route path="/library" element={<Library />} />}
                <Route path="/theater" element={<Theater />} />
                <Route path="/play" element={<Theater />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfirmDialogProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
