import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export const formatMessageTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date))     return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yyyy');
};

export const formatRelativeTime = (dateStr: string): string =>
  formatDistanceToNow(new Date(dateStr), { addSuffix: true });

export const formatStoryCountdown = (secondsRemaining: number): string => {
  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};