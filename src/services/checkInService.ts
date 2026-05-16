import { Meeting } from '../types';
import { recomputeStatusFromCheckIns } from './meetingService';

export function validateQRCode(meeting: Meeting, scannedCode: string): boolean {
  return meeting.qrCode === scannedCode;
}

export function updateCheckInStatus(meeting: Meeting, userId: string): Meeting {
  const checkIns = meeting.checkIns.map((c) =>
    c.userId === userId
      ? { ...c, status: 'checked_in' as const, checkedInAt: new Date().toISOString() }
      : c,
  );
  return recomputeStatusFromCheckIns({ ...meeting, checkIns });
}

export function simulateCheckIn(meeting: Meeting, userId: string): Meeting {
  return updateCheckInStatus(meeting, userId);
}

export function isUserCheckedIn(meeting: Meeting, userId: string): boolean {
  return meeting.checkIns.some((c) => c.userId === userId && c.status === 'checked_in');
}
