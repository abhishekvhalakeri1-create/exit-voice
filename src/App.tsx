import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MailboxDrawer } from './components/MailboxDrawer';
import { ReportModal } from './components/ReportModal';
import { LandingPage } from './pages/LandingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import {
  ForgotPasswordPage,
  RegisterPage,
  ResetPasswordPage,
  SignInPage,
  VerifyEmailPage,
} from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { StoryComposerPage } from './pages/StoryComposerPage';
import { StoryDetailPage } from './pages/StoryDetailPage';
import { CompaniesListPage, CompanyDetailPage } from './pages/CompaniesPage';
import { ModerationPage } from './pages/ModerationPage';
import { SettingsPage } from './pages/SettingsPage';

function ToastContainer() {
  const { toasts } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ boxShadow: 'var(--shadow-overlay)' }}
          className={`px-4 py-2.5 rounded-md text-xs font-medium border pointer-events-auto ${
            t.tone === 'error'
              ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--border-strong)]'
              : t.tone === 'success'
                ? 'bg-[var(--status-positive-bg)] text-[var(--status-positive)] border-[var(--border-strong)]'
                : 'ev-surface text-[var(--text-primary)] ev-border'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/submit" element={<StoryComposerPage />} />
          <Route path="/submit/:id" element={<StoryComposerPage />} />
          <Route path="/stories/:slug" element={<StoryDetailPage />} />
          <Route path="/companies" element={<CompaniesListPage />} />
          <Route path="/companies/:slug" element={<CompanyDetailPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
      <MailboxDrawer />
      <ReportModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
