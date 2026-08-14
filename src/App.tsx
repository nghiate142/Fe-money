import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './lib/api';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { DebtsPage } from './features/debts/DebtsPage';
import { PeoplePage } from './features/people/PeoplePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { CategoriesPage } from './features/categories/CategoriesPage';

export default function App() {
  const [token, setTokenState] = useState(getToken());

  if (!token) return <LoginPage onLoggedIn={() => setTokenState(getToken())} />;

  return (
    <Layout onLoggedOut={() => setTokenState(null)}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
