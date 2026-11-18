import { api } from '../../api/client';

export interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MemberProfileItem {
  id: string;
  userId: string;
  phone: string;
  birthDate: string;
  emergencyContactPhone?: string;
  user?: ProfileUser;
}

export interface WorkerProfileItem {
  id: string;
  userId: string;
  area: string;
  shift: string;
  user?: ProfileUser;
}

export async function fetchMembersRequest(): Promise<MemberProfileItem[]> {
  const { data } = await api.get('/members-profile');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function fetchWorkersRequest(): Promise<WorkerProfileItem[]> {
  const { data } = await api.get('/worker-profile');
  return Array.isArray(data) ? data : data.data ?? [];
}