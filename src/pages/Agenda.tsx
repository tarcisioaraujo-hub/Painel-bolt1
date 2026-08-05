import { useState, useEffect, useMemo } from 'react';
import type { Appointment, AppointmentStatus, Slot } from '@/types/database';
import {
  subscribeSlotsInRange,
  subscribeAppointmentsInRange,
  toggleSlot,
  toggleDaySlots,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from '@/lib/firestore';
import Modal from '@/components/Modal';
import AppointmentForm from '@/components/AppointmentForm';
import { showToast } from '@/components/Toast';
import { ChevronLeft, ChevronRight, Lock, Unlock, Plus, Trash2, Pencil, X } from 'lucide-react';

type AgendaProps = {
  newAppointmentSignal: number;
  refreshSignal: number;
  onRefreshChange: (v: boolean) => void;
};

type ViewMode = 'day' | 'week' | 'month';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthDays(base: Date): Date[] {
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days.filter((d): d is Date => d !== null && d.getDay() >= 1 && d.getDay() <= 5);
}

function slotDateTime(day: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const dt = new Date(day);
  dt.setHours(h, m, 0, 0);
  return dt;
}

export default function Agenda({ newAppointmentSignal, refreshSignal, onRefreshChange }: AgendaProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [fixedDateTime, setFixedDateTime] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute date range based on view mode
  const { rangeStart, rangeEnd, displayDays } = useMemo(() => {
    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start, rangeEnd: end, displayDays: [currentDate] };
    } else if (viewMode === 'week') {
      const days = getWeekDays(currentDate);
      const start = new Date(days[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(days[4]);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start, rangeEnd: end, displayDays: days };
    } else {
      const days = getMonthDays(currentDate);
      const start = new Date(days[0] || currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(days[days.length - 1] || currentDate);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start, rangeEnd: end, displayDays: days };
    }
  }, [viewMode, currentDate]);

  // Subscribe to slots
  useEffect(() => {
    const unsub = subscribeSlotsInRange(dateKey(rangeStart), dateKey(rangeEnd), (data) => {
      setSlots(data);
      setLoading(false);
      onRefreshChange(false);
    });
    return unsub;
  }, [rangeStart, rangeEnd, refreshKey, onRefreshChange]);

  // Subscribe to appointments
  useEffect(() => {
    const unsub = subscribeAppointmentsInRange(rangeStart.toISOString(), rangeEnd.toISOString(), (data) => {
      setAppointments(data);
    });
    return unsub;
  }, [rangeStart, rangeEnd, refreshKey]);

  useEffect(() => {
    if (refreshSignal > 0) setRefreshKey((k) => k + 1);
  }, [refreshSignal]);

  useEffect(() => {
    if (newAppointmentSignal > 0) {
      setEditing(null);
      setFixedDateTime(null);
      setFormOpen(true);
    }
  }, [newAppointmentSignal]);

  const slotMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    slots.forEach((s) => { map[`${s.date}_${s.time}`] = s.status === 'open'; });
    return map;
  }, [slots]);

  const aptMap = useMemo(() => {
    const map: Record<string, Appointment> = {};
    appointments.forEach((a) => { map[a.slotId] = a; });
    return map;
  }, [appointments]);

  const isSlotOpen = (date: string, time: string) => slotMap[`${date}_${time}`] === true;
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const findAppointment = (day: Date, time: string): Appointment | undefined => {
    const date = dateKey(day);
    return aptMap[`${date}_${time}`];
  };

  const handleSlotToggle = async (day: Date, time: string) => {
    const date = dateKey(day);
    const isOpen = isSlotOpen(date, time);
    onRefreshChange(true);
    try {
      await toggleSlot(date, time, !isOpen);
      showToast(!isOpen ? 'Horário aberto' : 'Horário fechado');
    } catch {
      showToast('Erro ao alterar horário', 'error');
    }
  };

  const handleToggleDay = async (day: Date, makeOpen: boolean) => {
    onRefreshChange(true);
    try {
      await toggleDaySlots(dateKey(day), TIME_SLOTS, makeOpen);
      showToast(makeOpen ? 'Todos os horários abertos' : 'Todos os horários fechados');
    } catch {
      showToast('Erro ao alterar horários', 'error');
    }
  };

  const handleSlotClick = (day: Date, time: string) => {
    const apt = findAppointment(day, time);
    if (apt) {
      setEditing(apt);
      setFixedDateTime(null);
      setFormOpen(true);
    } else {
      const date = dateKey(day);
      if (!isSlotOpen(date, time)) {
        showToast('Horário fechado. Abra-o primeiro.', 'info');
        return;
      }
      setEditing(null);
      setFixedDateTime(slotDateTime(day, time).toISOString());
      setFormOpen(true);
    }
  };

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
      showToast('Consulta excluída');
      setConfirmDelete(null);
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  const prev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const next = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (viewMode === 'week') {
      const days = getWeekDays(currentDate);
      return `${days[0].getDate()}/${String(days[0].getMonth()+1).padStart(2,'0')} – ${days[4].getDate()}/${String(days[4].getMonth()+1).padStart(2,'0')}/${days[4].getFullYear()}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, currentDate]);

  const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    scheduled: { bg: '#F9F4E8', text: '#8B7430', border: '#E2C97E', dot: '#C9A84C' },
    completed: { bg: '#EFFDF3', text: '#15803D', border: '#86EFAC', dot: '#16a34a' },
    cancelled: { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', dot: '#dc2626' },
  };

  // Month view: calendar grid
  if (viewMode === 'month') {
    const allMonthDays: (Date | null)[] = (() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startWeekday = firstDay.getDay();
      const days: (Date | null)[] = [];
      for (let i = 0; i < startWeekday; i++) days.push(null);
      for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
      return days;
    })();

    return (
      <div className="p-4 lg:p-6 animate-fade-in">
        <AgendaHeader
          label={headerLabel}
          onPrev={prev}
          onNext={next}
          onToday={goToday}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="card p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {allMonthDays.map((date, i) => {
              if (!date) return <div key={i} className="aspect-square rounded-lg" />;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const key = dateKey(date);
              const daySlots = TIME_SLOTS.filter((t) => isSlotOpen(key, t));
              const dayApts = appointments.filter((a) => a.scheduled_at.startsWith(key));
              const today = isToday(date);
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg border p-1.5 flex flex-col text-xs transition-all cursor-pointer hover:shadow-sm ${
                    isWeekend ? 'bg-stone-50 border-stone-100 text-stone-300' : 'border-stone-200'
                  } ${today ? 'ring-2 ring-amber-400' : ''}`}
                  onClick={() => { if (!isWeekend) { setCurrentDate(date); setViewMode('day'); } }}
                >
                  <span className={`font-medium ${today ? 'text-amber-700' : 'text-stone-700'}`}>{date.getDate()}</span>
                  {!isWeekend && dayApts.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {dayApts.slice(0, 4).map((a) => (
                        <div key={a.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[a.status].dot }} />
                      ))}
                      {dayApts.length > 4 && <span className="text-[8px] text-stone-400">+{dayApts.length - 4}</span>}
                    </div>
                  )}
                  {!isWeekend && daySlots.length > 0 && dayApts.length === 0 && (
                    <span className="text-[9px] text-amber-500 mt-auto">{daySlots.length} abertos</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <Legend />
        <FormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          editing={editing}
          fixedDateTime={fixedDateTime}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
        <DeleteModal
          confirmDelete={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  // Day and Week views: time grid
  const daysToShow = viewMode === 'day' ? [currentDate] : getWeekDays(currentDate);

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <AgendaHeader
        label={headerLabel}
        onPrev={prev}
        onNext={next}
        onToday={goToday}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">Carregando agenda...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className={viewMode === 'day' ? 'min-w-full' : 'min-w-[760px]'}>
              {/* Day headers */}
              <div className={`grid border-b border-stone-200 ${viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(5,1fr)]'}`}>
                <div className="px-3 py-3 text-xs font-medium text-stone-400 text-right">Horário</div>
                {daysToShow.map((day, i) => {
                  const key = dateKey(day);
                  const dayOpenCount = TIME_SLOTS.filter((t) => isSlotOpen(key, t)).length;
                  const allClosed = dayOpenCount === 0;
                  const allOpen = dayOpenCount === TIME_SLOTS.length;
                  const today = isToday(day);
                  return (
                    <div key={i} className={`px-3 py-3 border-l border-stone-200 flex items-center justify-between ${today ? 'bg-amber-50/40' : ''}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-stone-400">
                          {viewMode === 'day' ? day.toLocaleDateString('pt-BR', { weekday: 'long' }) : DAY_SHORT[i]}
                        </span>
                        <span className={`text-lg font-semibold ${today ? '' : 'text-stone-900'}`} style={today ? { color: '#C9A84C' } : {}}>
                          {day.getDate()}
                          <span className="text-xs font-normal text-stone-400 ml-1">
                            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][day.getMonth()]}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleDay(day, !allOpen)}
                          className={`p-1.5 rounded-lg text-xs transition-all ${
                            allClosed
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={allClosed ? 'Abrir todos os horários' : 'Fechar todos os horários'}
                        >
                          {allClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time rows */}
              {TIME_SLOTS.map((time) => (
                <div key={time} className={`grid border-b border-stone-100 last:border-b-0 ${viewMode === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(5,1fr)]'}`}>
                  <div className="px-3 py-2 text-sm font-medium text-stone-500 text-right border-r border-stone-100 flex items-center justify-end">
                    {time}
                  </div>
                  {daysToShow.map((day, i) => {
                    const date = dateKey(day);
                    const isOpen = isSlotOpen(date, time);
                    const apt = findAppointment(day, time);
                    const today = isToday(day);
                    return (
                      <div
                        key={i}
                        className={`border-l border-stone-100 min-h-[72px] p-1.5 transition-colors ${today ? 'bg-amber-50/20' : ''}`}
                      >
                        {apt ? (
                          <div
                            className="h-full rounded-lg px-2.5 py-2 flex flex-col gap-1 group relative cursor-pointer"
                            style={{ backgroundColor: statusColors[apt.status].bg, border: `1px solid ${statusColors[apt.status].border}` }}
                            onClick={() => { setEditing(apt); setFixedDateTime(null); setFormOpen(true); }}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[apt.status].dot }} />
                              <span className="text-xs font-semibold truncate" style={{ color: statusColors[apt.status].text }}>
                                {apt.patientName}
                              </span>
                            </div>
                            {apt.procedure && <span className="text-[11px] text-stone-500 truncate">{apt.procedure}</span>}
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditing(apt); setFixedDateTime(null); setFormOpen(true); }}
                                className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-white/60"
                                title="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(apt); }}
                                className="p-1 rounded text-stone-500 hover:text-red-600 hover:bg-white/60"
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <select
                              value={apt.status}
                              onChange={(e) => { e.stopPropagation(); handleStatusChange(apt, e.target.value as AppointmentStatus); }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] rounded border border-stone-200 px-1 py-0.5 text-stone-600 focus:outline-none cursor-pointer mt-auto w-fit"
                            >
                              <option value="scheduled">Agendado</option>
                              <option value="completed">Concluído</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => isOpen ? handleSlotClick(day, time) : handleSlotToggle(day, time)}
                            className={`h-full w-full rounded-lg flex items-center justify-center transition-all ${
                              isOpen ? 'bg-amber-50/40 hover:bg-amber-100/60 border border-dashed border-amber-300' : 'bg-stone-50 hover:bg-stone-100'
                            }`}
                            title={isOpen ? 'Abrir para agendamento' : 'Horário fechado — clique para abrir'}
                          >
                            {isOpen ? (
                              <Plus className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-stone-300" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Legend />

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        fixedDateTime={fixedDateTime}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      <DeleteModal
        confirmDelete={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function AgendaHeader({
  label,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}) {
  const modes: { id: ViewMode; label: string }[] = [
    { id: 'day', label: 'Dia' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mês' },
  ];
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <button onClick={onPrev} className="btn-icon"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-semibold text-stone-900 min-w-[180px] text-center capitalize">{label}</h2>
        <button onClick={onNext} className="btn-icon"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToday} className="btn-secondary text-xs px-3 py-1.5">Hoje</button>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onViewModeChange(m.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === m.id ? 'text-[#1A1A1A]' : 'text-stone-500 hover:bg-stone-50'
              }`}
              style={viewMode === m.id ? { backgroundColor: '#C9A84C' } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-stone-500">
      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#C9A84C' }} /> Agendado</div>
      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#16a34a' }} /> Concluído</div>
      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#dc2626' }} /> Cancelado</div>
      <div className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Horário fechado</div>
      <div className="flex items-center gap-1.5"><Unlock className="w-3 h-3" /> Horário aberto</div>
    </div>
  );
}

function FormModal({
  open,
  onClose,
  editing,
  fixedDateTime,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Appointment | null;
  fixedDateTime: string | null;
  onSaved: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar consulta' : 'Nova consulta'}>
      <AppointmentForm
        open={open}
        onClose={onClose}
        onSaved={onSaved}
        appointment={editing}
        fixedDateTime={fixedDateTime}
      />
    </Modal>
  );
}

function DeleteModal({
  confirmDelete,
  onClose,
  onConfirm,
}: {
  confirmDelete: Appointment | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!confirmDelete} onClose={onClose} title="Excluir consulta" size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <X className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm text-stone-600 pt-1.5">
          Excluir a consulta de <strong>{confirmDelete?.patientName}</strong>? Esta ação não pode ser desfeita.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-danger" onClick={onConfirm}>Excluir</button>
      </div>
    </Modal>
  );
}
