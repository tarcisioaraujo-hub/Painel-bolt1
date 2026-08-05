import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment, AppointmentStatus, Slot } from '@/types/database';

function slotId(date: string, time: string): string {
  return `${date}_${time}`;
}

export async function getSlotsInRange(startDate: string, endDate: string): Promise<Slot[]> {
  const q = query(collection(db, 'slots'), where('date', '>=', startDate), where('date', '<=', endDate));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Slot, 'id'>) }));
}

export function subscribeSlotsInRange(startDate: string, endDate: string, cb: (slots: Slot[]) => void): () => void {
  const q = query(collection(db, 'slots'), where('date', '>=', startDate), where('date', '<=', endDate));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Slot, 'id'>) })));
  });
}

export async function toggleSlot(date: string, time: string, makeOpen: boolean): Promise<void> {
  const id = slotId(date, time);
  await setDoc(doc(db, 'slots', id), {
    date,
    time,
    status: makeOpen ? 'open' : 'closed',
  }, { merge: true });
}

export async function toggleDaySlots(date: string, times: string[], makeOpen: boolean): Promise<void> {
  await Promise.all(times.map((t) => toggleSlot(date, t, makeOpen)));
}

export async function getAppointmentsInRange(startISO: string, endISO: string): Promise<Appointment[]> {
  const q = query(
    collection(db, 'appointments'),
    where('scheduled_at', '>=', startISO),
    where('scheduled_at', '<=', endISO),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }));
}

export function subscribeAppointmentsInRange(startISO: string, endISO: string, cb: (apts: Appointment[]) => void): () => void {
  const q = query(
    collection(db, 'appointments'),
    where('scheduled_at', '>=', startISO),
    where('scheduled_at', '<=', endISO),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) })));
  });
}

export async function getSlotsForDate(date: string): Promise<Slot[]> {
  const q = query(collection(db, 'slots'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Slot, 'id'>) }));
}

export async function getAppointmentsForDate(date: string): Promise<Appointment[]> {
  const start = new Date(date + 'T00:00:00');
  const end = new Date(date + 'T23:59:59');
  const q = query(
    collection(db, 'appointments'),
    where('scheduled_at', '>=', start.toISOString()),
    where('scheduled_at', '<=', end.toISOString()),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }));
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const snap = await getDocs(collection(db, 'appointments'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }));
}

export function subscribeAllAppointments(cb: (apts: Appointment[]) => void): () => void {
  return onSnapshot(collection(db, 'appointments'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) })));
  });
}

export async function createAppointment(data: Omit<Appointment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'appointments'), data);
  return ref.id;
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<void> {
  await updateDoc(doc(db, 'appointments', id), data as Record<string, unknown>);
}

export async function deleteAppointment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'appointments', id));
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  await updateDoc(doc(db, 'appointments', id), { status });
}
