import { Match, Meeting, MeetingStatus } from '../types';
import { createId } from '../utils/id';

export function generateQRCode(meetingId: string): string {
  // Mock QR code payload — encoded as a stable token string.
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SIP-${meetingId.slice(-6).toUpperCase()}-${suffix}`;
}

export function createMeeting(match: Match): Meeting {
  const id = createId('meet');
  return {
    id,
    matchId: match.id,
    cafeId: match.suggestedCafeId,
    date: match.suggestedDate,
    startTime: match.suggestedStartTime,
    endTime: match.suggestedEndTime,
    status: 'confirmed',
    qrCode: generateQRCode(id),
    checkIns: [
      { userId: match.userAId, checkedInAt: null, status: 'waiting' },
      { userId: match.userBId, checkedInAt: null, status: 'waiting' },
    ],
  };
}

export function confirmMeeting(meeting: Meeting): Meeting {
  return { ...meeting, status: 'confirmed' };
}

export function cancelMeeting(meeting: Meeting): Meeting {
  return { ...meeting, status: 'cancelled' };
}

export function updateMeetingStatus(meeting: Meeting, status: MeetingStatus): Meeting {
  return { ...meeting, status };
}

export function recomputeStatusFromCheckIns(meeting: Meeting): Meeting {
  const checkedIn = meeting.checkIns.filter((c) => c.status === 'checked_in').length;
  let status: MeetingStatus = meeting.status;
  if (status === 'cancelled' || status === 'no_show' || status === 'completed') return meeting;
  if (checkedIn === 0) status = 'confirmed';
  else if (checkedIn === 1) status = 'one_checked_in';
  else if (checkedIn >= 2) status = 'both_checked_in';
  return { ...meeting, status };
}
