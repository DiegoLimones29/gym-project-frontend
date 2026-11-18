import { api } from '../../api/client';

export interface MembershipPlanItem {
  id: number;
  name: string;
  description: string;
  price: number | string;
  durationDays: number;
}

export interface CreatePlanPayload {
  name: string;
  description: string;
  price: number;
  durationDays: number;
}

export interface SubscriptionItem {
  id: string;
  memberId: string;
  planId: number;
  startDate: string;
  endDate: string;
  status: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  membershipPlan?: MembershipPlanItem;
}

export interface CreateSubscriptionPayload {
  memberId: string;
  planId: number;
  startDate?: string;
}

export async function fetchPlansRequest(): Promise<MembershipPlanItem[]> {
  const { data } = await api.get('/membership-plan');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createPlanRequest(payload: CreatePlanPayload) {
  const { data } = await api.post('/membership-plan', payload);
  return data;
}

export async function fetchSubscriptionsRequest(): Promise<SubscriptionItem[]> {
  const { data } = await api.get('/subscription');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createSubscriptionRequest(payload: CreateSubscriptionPayload) {
  const { data } = await api.post('/subscription', payload);
  return data;
}

export async function cancelSubscriptionRequest(id: string) {
  const { data } = await api.patch(`/subscription/${id}`, {
    status: 'cancelled',
  });
  return data;
}

export async function deleteSubscriptionRequest(id: string) {
  const { data } = await api.delete(`/subscription/${id}`);
  return data;
}