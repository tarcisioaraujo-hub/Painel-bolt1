import { useState, useCallback } from 'react';
import Sidebar, { Topbar, type Page } from '@/components/Sidebar';
import { ToastContainer } from '@/components/Toast';
import Dashboard from '@/pages/Dashboard';
import Agenda from '@/pages/Agenda';
import Bookings from '@/pages/Bookings';

const pageTitles: Record<Page, string> = {
  dashboard: 'Painel',
  appointments: 'Agenda',
  bookings: 'Agendamentos',
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newAppointmentSignal, setNewAppointmentSignal] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleNewAppointment = () => {
    setPage('appointments');
    setNewAppointmentSignal((n) => n + 1);
  };

  const handleRefresh = useCallback(() => {
    setRefreshSignal((n) => n + 1);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          title={pageTitles[page]}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <main className="flex-1">
          {page === 'dashboard' && (
            <Dashboard
              onNewAppointment={handleNewAppointment}
              onNavigate={setPage}
              refreshSignal={refreshSignal}
            />
          )}
          {page === 'appointments' && (
            <Agenda
              newAppointmentSignal={newAppointmentSignal}
              refreshSignal={refreshSignal}
              onRefreshChange={setRefreshing}
            />
          )}
          {page === 'bookings' && <Bookings refreshSignal={refreshSignal} />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
