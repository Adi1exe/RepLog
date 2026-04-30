import client from './client';

export const getDashboard = () => client.get('/workouts/dashboard');
export const getWorkoutsHistory = (skip = 0, limit = 20) => client.get('/workouts/', { params: { skip, limit } });
export const submitVitals = (data) => client.post('/onboarding/vitals', data);
export const getBMISuggestion = (data) => client.post('/onboarding/bmi-suggest', data);
export const logWorkout = (data) => client.post('/workouts/', data);
export const deleteWorkout = (id) => client.delete(`/workouts/${id}`);
export const getVitals = () => client.get('/onboarding/vitals');
