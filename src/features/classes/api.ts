import { api } from '../../api/client';

export interface FitnessClassItem {
  id: string;
  name: string;
  description: string;
  capacity: number;
  isActive: boolean;
}

export interface CreateFitnessClassPayload {
  name: string;
  description: string;
  capacity: number;
}

export interface ClassBookingItem {
  id: string;
  classScheduleId: string;
  memberId: string;
  bookingStatus: string;
  bookedAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ClassScheduleItem {
  id: string;
  classId: string;
  trainerId: string;
  roomName: string;
  startTime: string;
  endTime: string;
  status: string;
  fitnessClass?: FitnessClassItem;
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  classBookings?: ClassBookingItem[];
}

export interface CreateClassSchedulePayload {
  classId: string;
  trainerId: string;
  roomName: string;
  startTime: string;
  endTime: string;
}

export interface CreateClassBookingPayload {
  classScheduleId: string;
  memberId: string;
}

export async function fetchFitnessClassesRequest(): Promise<FitnessClassItem[]> {
  const { data } = await api.get('/fitness-class');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createFitnessClassRequest(payload: CreateFitnessClassPayload) {
  const { data } = await api.post('/fitness-class', payload);
  return data;
}

export async function fetchClassSchedulesRequest(): Promise<ClassScheduleItem[]> {
  const { data } = await api.get('/class-schedule');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createClassScheduleRequest(payload: CreateClassSchedulePayload) {
  const { data } = await api.post('/class-schedule', payload);
  return data;
}

export async function updateClassScheduleStatusRequest(id: string, status: string) {
  const { data } = await api.patch(`/class-schedule/${id}`, { status });
  return data;
}

export async function createClassBookingRequest(payload: CreateClassBookingPayload) {
  const { data } = await api.post('/class-booking', payload);
  return data;
}

export async function cancelClassBookingRequest(id: string) {
  const { data } = await api.patch(`/class-booking/${id}`, {
    bookingStatus: 'cancelled',
  });
  return data;
}