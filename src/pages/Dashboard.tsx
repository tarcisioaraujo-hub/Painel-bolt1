import { useState, useEffect, useMemo } from 'react';
import type { Appointment } from '@/types/database';
import { subscribeAllAppointments } from '@/lib/firestore';
import { CalendarDays, Clock, CheckCircle2, ClipboardList, Plus, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/Toast';
import { updateAppointmentStatus } from '@/lib/firestore';

type DashboardProps = {
  onNewAppointment: () => void;
  onNavigate: (page: 'appointments' | 'bookings') => void;
  refreshSignal: number;
};

export default function Dashboard({ onNewAppointment, onNavigate, refreshSignal }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsub = subscribeAllAppointments((data) => {
      setAppointments(data);
      setLoading(false);
    });
    return unsub;
  }, [refreshKey]);

  useEffect(() => {
    if (refreshSignal > 0) setRefreshKey((k) => k + 1);
  }, [refreshSignal]);

  const todayAppointments = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return appointments
      .filter((a) => {
        const d = new Date(a.scheduled_at);
        return d >= start && d < end;
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [appointments]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return {
      todayCount: todayAppointments.length,
      thisWeek: appointments.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d >= startOfWeek && d < endOfWeek;
      }).length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      total: appointments.length,
    };
  }, [appointments, todayAppointments]);

  const handleQuickStatus = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      await updateAppointmentStatus(id, status);
      showToast(status === 'completed' ? 'Consulta concluída' : 'Consulta cancelada');
    } catch {
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
      completed: 'bg-green-50 text-green-700 border border-green-200',
      cancelled: 'bg-red-50 text-red-600 border border-red-200',
    };
    const label: Record<string, string> = { scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado' };
    return <span className={`badge ${map[status]}`}>{label[status]}</span>;
  };

  const statCards = [
    { label: 'Consultas hoje', value: stats.todayCount, icon: CalendarDays },
    { label: 'Esta semana', value: stats.thisWeek, icon: Clock },
    { label: 'Total agendamentos', value: stats.total, icon: ClipboardList },
    { label: 'Concluídas (total)', value: stats.completed, icon: CheckCircle2 },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9F4E8' }}>
                  <Icon className="w-5 h-5" style={{ color: '#C9A84C' }} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-stone-900">{loading ? '—' : s.value}</p>
              <p className="text-sm text-stone-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Consultas de hoje</h2>
            <p className="text-sm text-stone-500 mt-0.5 capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={onNewAppointment} className="btn-primary">
            <Plus className="w-4 h-4" /> Nova consulta
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">Carregando...</div>
        ) : todayAppointments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#F9F4E8' }}>
              <CalendarDays className="w-6 h-6" style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-stone-600 font-medium">Nenhuma consulta para hoje</p>
            <p className="text-sm text-stone-400 mt-1">Clique em "Nova consulta" para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {todayAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors group">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg shrink-0" style={{ backgroundColor: '#F9F4E8' }}>
                  <span className="text-sm font-semibold" style={{ color: '#C9A84C' }}>{formatTime(apt.scheduled_at)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{apt.patientName}</p>
                  <p className="text-sm text-stone-500 truncate">
                    {apt.procedure || 'Consulta'}{apt.patientPhone ? ` · ${apt.patientPhone}` : ''}
                  </p>
                </div>
                {statusBadge(apt.status)}
                {apt.status === 'scheduled' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleQuickStatus(apt.id, 'completed')}
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                      title="Concluir consulta"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button onClick={() => onNavigate('appointments')} className="text-stone-300 group-hover:text-stone-400 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('appointments')}
          className="card p-5 text-left hover:shadow-md transition-shadow group border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Visualizar</p>
              <p className="text-lg font-semibold text-stone-900">Agenda</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9F4E8' }}>
              <CalendarDays className="w-5 h-5" style={{ color: '#C9A84C' }} />
            </div>
          </div>
          <p className="text-sm text-stone-400 mt-2 group-hover:text-stone-600 transition-colors">
            {stats.thisWeek} consulta(s) esta semana →
          </p>
        </button>
        <button
          onClick={() => onNavigate('bookings')}
          className="card p-5 text-left hover:shadow-md transition-shadow group border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Visualizar</p>
              <p className="text-lg font-semibold text-stone-900">Agendamentos</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F9F4E8' }}>
              <ClipboardList className="w-5 h-5" style={{ color: '#C9A84C' }} />
            </div>
          </div>
          <p className="text-sm text-stone-400 mt-2 group-hover:text-stone-600 transition-colors">
            {stats.total} agendamento(s) no total →
          </p>
        </button>
      </div>
    </div>
  );
}
