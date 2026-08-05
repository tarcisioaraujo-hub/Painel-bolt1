export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  scheduled_at: string;
  status: AppointmentStatus;
  procedure: string;
  notes: string;
  slotId: string;
};

export type SlotStatus = 'open' | 'closed';

export type Slot = {
  id: string;
  date: string;
  time: string;
  status: SlotStatus;
};
