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

// Two builds, one repo.
//
//   npm run dev          — everything, locally
//   npm run build:pod    — the Dramaton POD: the editor, for Doug's own
//                          room in the pond
//   npm run build:games  — theater only: what you hand someone when you
//                          share a game link. No editor routes exist.
//
// A plain `npm run build` stays theater-only, so the cautious default
// is the one that cannot leak the editor.
const isEditorBuild =
  import.meta.env.DEV || import.meta.env.MODE === 'pod';

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
                <Route path="/" element={isEditorBuild ? <Index /> : <GameLanding />} />
                {isEditorBuild && <Route path="/auth" element={<Auth />} />}
                {isEditorBuild && <Route path="/library" element={<Library />} />}
                <Route path="/theater" element={<ErrorBoundary where="The theater"><Theater /></ErrorBoundary>} />
                <Route path="/play" element={<ErrorBoundary where="The theater"><Theater /></ErrorBoundary>} />
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
