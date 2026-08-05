import { useState, useEffect } from 'react';
import type { Appointment, AppointmentStatus } from '@/types/database';
import { subscribeAllAppointments, updateAppointmentStatus, deleteAppointment } from '@/lib/firestore';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { Search, Trash2, Phone, X, ClipboardList, Calendar, Clock } from 'lucide-react';

type BookingsProps = {
  refreshSignal: number;
};

type FilterStatus = 'all' | AppointmentStatus;

export default function Bookings({ refreshSignal }: BookingsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
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

  const filtered = appointments
    .filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a.patientName.toLowerCase().includes(s) ||
          (a.patientPhone || '').includes(s) ||
          (a.procedure || '').toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const handleStatusChange = async (apt: Appointment, status: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(apt.id, status);
      showToast('Status atualizado');
    } catch {
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteAppointment(confirmDelete.id);
      showToast('Agendamento excluído');
      setConfirmDelete(null);
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
      completed: 'bg-green-50 text-green-700 border border-green-200',
      cancelled: 'bg-red-50 text-red-600 border border-red-200',
    };
    const label: Record<string, string> = { scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado' };
    return <span className={`badge ${map[status]}`}>{label[status]}</span>;
  };

  const filterButtons: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'scheduled', label: 'Agendados' },
    { id: 'completed', label: 'Concluídos' },
    { id: 'cancelled', label: 'Cancelados' },
  ];

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome, telefone ou procedimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden">
          {filterButtons.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.id ? 'text-[#1A1A1A]' : 'text-stone-500 hover:bg-stone-50'
              }`}
              style={statusFilter === f.id ? { backgroundColor: '#C9A84C' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">Carregando agendamentos...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#F9F4E8' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-stone-600 font-medium">
              {appointments.length === 0 ? 'Nenhum agendamento na base de dados' : 'Nenhum agendamento encontrado'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {appointments.length === 0 ? 'Os agendamentos criados na agenda aparecerão aqui' : 'Tente ajustar a busca ou o filtro'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/50">
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3">Paciente</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell">Contato</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">Data</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3 hidden lg:table-cell">Procedimento</th>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-stone-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: '#F9F4E8', color: '#C9A84C' }}>
                          {apt.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{apt.patientName}</p>
                          {apt.notes && <p className="text-xs text-stone-400 truncate max-w-[200px]">{apt.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {apt.patientPhone ? (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          <Phone className="w-3 h-3" /> {apt.patientPhone}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-stone-600">
                          <Calendar className="w-3 h-3 text-stone-400" /> {formatDate(apt.scheduled_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          <Clock className="w-3 h-3 text-stone-400" /> {formatTime(apt.scheduled_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-stone-600">{apt.procedure || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt, e.target.value as AppointmentStatus)}
                        className="text-xs rounded-md border border-stone-200 px-2 py-1.5 text-stone-600 focus:outline-none cursor-pointer"
                      >
                        <option value="scheduled">Agendado</option>
                        <option value="completed">Concluído</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setConfirmDelete(apt)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Excluir agendamento" size="sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-stone-600 pt-1.5">
            Excluir o agendamento de <strong>{confirmDelete?.patientName}</strong> ({confirmDelete ? formatDateTime(confirmDelete.scheduled_at) : ''})?
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
          <button className="btn-danger" onClick={handleDelete}>Excluir</button>
        </div>
      </Modal>
    </div>
  );
}
