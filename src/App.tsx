import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Tenders from "./pages/Tenders.tsx";
import Vendors from "./pages/Vendors.tsx";
import Notifications from "./pages/Notifications.tsx";
import NotFound from "./pages/NotFound.tsx";
import BidEvaluation from "./pages/BidEvaluation.tsx";
import Awards from "./pages/Awards.tsx";
import AiInsights from "./pages/AiInsights.tsx";
import Reports from "./pages/Reports.tsx";
import Compliance from "./pages/Compliance.tsx";
import HelpDesk from "./pages/HelpDesk.tsx";
import VendorDashboard from "./pages/VendorDashboard.tsx";
import VendorSignup from "./pages/VendorSignup.tsx";
import VendorVerification from "./pages/VendorVerification.tsx";
import Documents from "./pages/Documents.tsx";
import { AdminStoreProvider } from "./store/admin-store.tsx";
import Login from "./pages/Login.tsx";
import { AuthProvider } from "./store/auth-store.tsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { LangProvider } from "./store/lang-store.tsx";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LangProvider>
        <AuthProvider>
          <AdminStoreProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/vendor-signup" element={<VendorSignup />} />
              <Route path="/vendor-verification" element={<ProtectedRoute roles={["vendor"]}><VendorVerification /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute roles={["admin"]}><Index /></ProtectedRoute>} />
              <Route path="/tenders" element={<ProtectedRoute roles={["admin"]}><Tenders /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute roles={["admin"]}><Vendors /></ProtectedRoute>} />
              <Route path="/vendor-dashboard" element={<ProtectedRoute roles={["vendor"]}><VendorDashboard /></ProtectedRoute>} />
              <Route path="/bid-evaluation" element={<ProtectedRoute roles={["admin"]}><BidEvaluation /></ProtectedRoute>} />
              <Route path="/awards" element={<ProtectedRoute roles={["admin"]}><Awards /></ProtectedRoute>} />
              <Route path="/ai-insights" element={<ProtectedRoute roles={["admin"]}><AiInsights /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={["admin"]}><Reports /></ProtectedRoute>} />
              <Route path="/compliance" element={<ProtectedRoute roles={["admin"]}><Compliance /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute roles={["admin"]}><HelpDesk /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute roles={["admin", "vendor"]}><Notifications /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute roles={["admin", "vendor"]}><Documents /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminStoreProvider>
        </AuthProvider>
        </LangProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
