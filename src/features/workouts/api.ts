import { api } from '../../api/client';

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  targetMuscleGroup: string;
  equipmentNeeded?: string;
  videoUrl?: string;
}

export interface CreateExercisePayload {
  name: string;
  targetMuscleGroup: string;
  equipmentNeeded?: string;
  videoUrl?: string;
}

export interface RoutineExerciseItem {
  id: string;
  workoutPlanId: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  orderIndex: number;
  notes?: string;
  exercise?: ExerciseCatalogItem;
}

export interface WorkoutPlanItem {
  id: string;
  memberId: string;
  trainerId: string;
  title: string;
  goal: string;
  isActive: boolean;
  createdAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  routineExercises?: RoutineExerciseItem[];
}

export interface CreateWorkoutPlanPayload {
  memberId: string;
  trainerId: string;
  title: string;
  goal: string;
}

export interface CreateRoutineExercisePayload {
  workoutPlanId: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  orderIndex: number;
  notes?: string;
}

export async function fetchExerciseCatalogRequest(): Promise<ExerciseCatalogItem[]> {
  const { data } = await api.get('/exercise-catalog');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createExerciseCatalogRequest(payload: CreateExercisePayload) {
  const { data } = await api.post('/exercise-catalog', payload);
  return data;
}

export async function fetchWorkoutPlansRequest(): Promise<WorkoutPlanItem[]> {
  const { data } = await api.get('/workout-plan');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createWorkoutPlanRequest(payload: CreateWorkoutPlanPayload) {
  const { data } = await api.post('/workout-plan', payload);
  return data;
}

export async function toggleWorkoutPlanStatusRequest(id: string, isActive: boolean) {
  const { data } = await api.patch(`/workout-plan/${id}`, { isActive });
  return data;
}

export async function createRoutineExerciseRequest(payload: CreateRoutineExercisePayload) {
  const { data } = await api.post('/routine-exercise', payload);
  return data;
}

export async function deleteRoutineExerciseRequest(id: string) {
  const { data } = await api.delete(`/routine-exercise/${id}`);
  return data;
}