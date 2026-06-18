import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './store/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import DashboardPage from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import BanksPage from './pages/Banks';
import CardsPage from './pages/Cards';
import GoalsPage from './pages/Goals';
import RecurringPage from './pages/Recurring';
import AiInsightsPage from './pages/AiInsights';
import CategoriesPage from './pages/Categories';

import SettingsPage from './pages/Settings';
import NotificationsSettings from './pages/NotificationsSettings';
import ProfileSettings from './pages/ProfileSettings';
import SecuritySettings from './pages/SecuritySettings';
import LoginPage from './pages/Login';
import { MobilePreviewWrapper } from './components/layout/MobilePreviewWrapper';

function AppContent() {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/banks" element={<BanksPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          
          <Route path="/settings" element={<SettingsPage />}>
             <Route index element={<Navigate to="profile" replace />} />
             <Route path="profile" element={<ProfileSettings />} />
             <Route path="notifications" element={<NotificationsSettings />} />
             <Route path="security" element={<SecuritySettings />} />
          </Route>
          
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/ai-insights" element={<AiInsightsPage />} />
          
          {/* Catch-all route to prevent blank screens */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MobilePreviewWrapper>
        <AppContent />
      </MobilePreviewWrapper>
    </AppProvider>
  );
}