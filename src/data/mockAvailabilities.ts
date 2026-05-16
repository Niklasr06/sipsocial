import { Availability } from '../types';
import { todayIso, addDaysIso } from '../utils/date';

const t0 = todayIso();
const t1 = addDaysIso(t0, 1);
const t2 = addDaysIso(t0, 2);
const t3 = addDaysIso(t0, 3);

export const MOCK_AVAILABILITIES: Availability[] = [
  { id: 'av_2', userId: 'user_2', date: t1, startTime: '15:00', endTime: '17:30', area: 'Stuttgart-Mitte' },
  { id: 'av_3', userId: 'user_3', date: t1, startTime: '16:00', endTime: '18:00', area: 'Stuttgart-Mitte' },
  { id: 'av_4', userId: 'user_4', date: t2, startTime: '10:00', endTime: '12:00', area: 'Stuttgart-West' },
  { id: 'av_5', userId: 'user_5', date: t2, startTime: '14:00', endTime: '16:00', area: 'Stuttgart-Ost' },
  { id: 'av_6', userId: 'user_6', date: t1, startTime: '15:30', endTime: '17:00', area: 'Stuttgart-Mitte' },
  { id: 'av_7', userId: 'user_7', date: t3, startTime: '11:00', endTime: '13:00', area: 'Stuttgart-West' },
  { id: 'av_8', userId: 'user_8', date: t2, startTime: '15:00', endTime: '17:00', area: 'Stuttgart-Vaihingen' },
  { id: 'av_9', userId: 'user_9', date: t3, startTime: '10:00', endTime: '12:30', area: 'Esslingen' },
];
