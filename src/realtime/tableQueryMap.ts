export const TABLE_TO_QUERY_KEYS: Record<string, string[][]> = {
  member_profiles: [['members-profile']],
  workers_profiles: [['worker-profile']],
  membership_plans: [['membership-plans'], ['subscriptions']],
  subscriptions: [['subscriptions']],
  fitness_classes: [['fitness-classes'], ['class-schedules']],
  class_schedules: [['class-schedules']],
  class_bookings: [['class-schedules']],
  exercise_catalog: [['exercise-catalog'], ['workout-plans']],
  workout_plans: [['workout-plans']],
  routine_exercises: [['workout-plans']],
  fitness_assessments: [['fitness-assessments']],
  roles: [['roles']],
  users: [
    ['users'],
    ['members-profile'],
    ['worker-profile'],
    ['subscriptions'],
    ['class-schedules'],
    ['workout-plans'],
    ['fitness-assessments'],
  ],
};

export function getQueryKeysForTable(table: string): string[][] {
  return TABLE_TO_QUERY_KEYS[table] ?? [];
}
