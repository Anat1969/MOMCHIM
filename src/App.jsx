import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
// HashRouter: GitHub Pages serves static files only, so deep links live after the "#"
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import PersonaEditor from './pages/PersonaEditor';
import ExpertChat from './pages/ExpertChat';
import Confrontation from './pages/Confrontation';
import Settings from './pages/Settings';
import { onDataChange, syncWithGithub } from '@/api/store';
import { isCloud } from '@/api/backend';

function App() {
  useEffect(() => {
    const off = onDataChange(() => queryClientInstance.invalidateQueries());
    // Supabase is read live; the GitHub mirror only backs the local store.
    if (!isCloud()) syncWithGithub();
    return off;
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/persona/:id" element={<PersonaEditor />} />
            <Route path="/chat/:personaId" element={<ExpertChat />} />
            <Route path="/confrontation" element={<Confrontation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
