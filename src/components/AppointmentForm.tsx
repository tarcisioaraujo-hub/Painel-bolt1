import { useState, useEffect, useCallback } from 'react';
import type { Appointment, AppointmentStatus } from '@/types/database';
import {
  createAppointment,
  updateAppointment,
  getSlotsForDate,
  getAppointmentsForDate,
} from '@/lib/firestore';
import { showToast } from '@/components/Toast';

type AppointmentFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  appointment?: Appointment | null;
  fixedDateTime?: string | null;
};

function toLocalDateInput(date: Date): string {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDisplay(date: Date): string {
  const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const wd = weekdays[date.getDay()];
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${wd}, ${date.getDate()}/${String(date.getMonth()+1).padStart(2,'0')} às ${time}`;
}

export default function AppointmentForm({ open, onClose, onSaved, appointment, fixedDateTime }: AppointmentFormProps) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [procedure, setProcedure] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isFixed = !!fixedDateTime && !appointment;
  const dtDisplay = scheduledAt ? formatDisplay(new Date(scheduledAt)) : '';

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      const dt = new Date(appointment.scheduled_at);
      setPatientName(appointment.patientName);
      setPatientPhone(appointment.patientPhone || '');
      setScheduledAt(toLocalDateInput(dt) + 'T' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5));
      setStatus(appointment.status);
      setProcedure(appointment.procedure || '');
      setNotes(appointment.notes || '');
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
      setBookedTimes([]);
    } else if (fixedDateTime) {
      setPatientName('');
      setPatientPhone('');
      const dt = new Date(fixedDateTime);
      setScheduledAt(toLocalDateInput(dt) + 'T' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5));
      setStatus('scheduled');
      setProcedure('');
      setNotes('');
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
      setBookedTimes([]);
    } else {
      setPatientName('');
      setPatientPhone('');
      setScheduledAt('');
      setStatus('scheduled');
      setProcedure('');
      setNotes('');
      setSelectedDate(toLocalDateInput(new Date()));
      setSelectedTime('');
      setAvailableTimes([]);
      setBookedTimes([]);
    }
  }, [open, appointment, fixedDateTime]);

  const loadSlotsForDate = useCallback(async (date: string) => {
    if (!date) return;
    setLoadingSlots(true);
    try {
      const [slots, apts] = await Promise.all([
        getSlotsForDate(date),
        getAppointmentsForDate(date),
      ]);
      const open = slots
        .filter((s) => s.status === 'open' && s.date === date)
        .map((s) => s.time)
        .sort();
      const booked = apts
        .filter((a) => a.status !== 'cancelled')
        .map((a) => {
          const d = new Date(a.scheduled_at);
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        });
      setAvailableTimes(open);
      setBookedTimes(booked);
    } catch {
      setAvailableTimes([]);
      setBookedTimes([]);
    }
    setLoadingSlots(false);
  }, []);

  useEffect(() => {
    if (open && !appointment && !fixedDateTime && selectedDate) {
      loadSlotsForDate(selectedDate);
    }
  }, [open, selectedDate, appointment, fixedDateTime, loadSlotsForDate]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      setScheduledAt(`${selectedDate}T${selectedTime}`);
    }
  }, [selectedDate, selectedTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !scheduledAt) return;
    setSaving(true);

    const isoDate = new Date(scheduledAt).toISOString();
    const dateStr = scheduledAt.slice(0, 10);
    const timeStr = scheduledAt.slice(11, 16);
    const slotId = `${dateStr}_${timeStr}`;

    const payload = {
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      scheduled_at: isoDate,
      status,
      procedure: procedure.trim(),
      notes: notes.trim(),
      slotId,
    };

    try {
      if (appointment) {
        await updateAppointment(appointment.id, payload);
        showToast('Consulta atualizada');
      } else {
        await createAppointment(payload);
        showToast('Consulta agendada com sucesso');
      }
      onSaved();
      onClose();
    } catch {
      showToast('Erro ao salvar consulta', 'error');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nome do paciente *</label>
          <input
            className="input"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required
            autoFocus
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input
            className="input"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      {isFixed ? (
        <div>
          <label className="label">Horário</label>
          <div className="input bg-stone-50 text-stone-600 font-medium cursor-default">{dtDisplay}</div>
        </div>
      ) : appointment ? (
        <div>
          <label className="label">Data e hora</label>
          <input
            type="datetime-local"
            className="input"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Data *</label>
            <input
              type="date"
              className="input"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
              required
            />
          </div>
          <div>
            <label className="label">Horário disponível *</label>
            {loadingSlots ? (
              <div className="input bg-stone-50 text-stone-400 text-sm">Carregando horários...</div>
            ) : availableTimes.length === 0 ? (
              <div className="input bg-stone-50 text-stone-400 text-sm cursor-default">
                Nenhum horário aberto para este dia
              </div>
            ) : (
              <select
                className="input"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              >
                <option value="">Selecione um horário...</option>
                {availableTimes.map((t) => (
                  <option key={t} value={t} disabled={bookedTimes.includes(t)}>
                    {t}{bookedTimes.includes(t) ? ' (ocupado)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="label">Status</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
          <option value="scheduled">Agendado</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div>
        <label className="label">Procedimento</label>
        <input
          className="input"
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          placeholder="Ex: Limpeza, Extração, Canal, Clareamento..."
        />
      </div>

      <div>
        <label className="label">Observações</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionais sobre a consulta..."
        />
      </div>

      {isFixed || appointment ? null : availableTimes.length === 0 && !loadingSlots && selectedDate ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Não há horários abertos para esta data. Abra os horários na agenda antes de agendar.
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving || (!isFixed && !appointment && (!selectedDate || !selectedTime))}
        >
          {saving ? 'Salvando...' : appointment ? 'Salvar alterações' : 'Agendar consulta'}
        </button>
      </div>
    </form>
  );
}
