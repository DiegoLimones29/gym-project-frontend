import { api } from '../../api/client';

export interface FitnessAssessmentItem {
  id: string;
  memberId: string;
  workerId: string;
  assessmentDate: string;
  weightKg: number | string;
  bodyFatPercentage: number | string;
  notes?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  worker?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateFitnessAssessmentPayload {
  memberId: string;
  workerId: string;
  assessmentDate: string;
  weightKg: number;
  bodyFatPercentage: number;
  notes?: string;
}

export async function fetchAssessmentsRequest(): Promise<FitnessAssessmentItem[]> {
  const { data } = await api.get('/fitness-assessment');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createAssessmentRequest(payload: CreateFitnessAssessmentPayload) {
  const { data } = await api.post('/fitness-assessment', payload);
  return data;
}

export async function deleteAssessmentRequest(id: string) {
  const { data } = await api.delete(`/fitness-assessment/${id}`);
  return data;
}