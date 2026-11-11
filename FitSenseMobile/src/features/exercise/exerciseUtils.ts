import { ExerciseType } from './types';

export const EXERCISE_TYPE_META: Record<
  ExerciseType,
  { label: string; icon: string; met: number; color: string }
> = {
  WALKING: { label: 'Đi bộ', icon: '🚶', met: 3.5, color: '#10B981' },
  RUNNING: { label: 'Chạy bộ', icon: '🏃', met: 8.5, color: '#3B82F6' },
  CYCLING: { label: 'Đạp xe', icon: '🚴', met: 7.5, color: '#F59E0B' },
};

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateCalories(
  type: ExerciseType,
  durationSeconds: number,
  weightKg: number | null | undefined = 70
): number {
  const safeWeight = weightKg && weightKg > 20 ? weightKg : 70;
  const met = EXERCISE_TYPE_META[type]?.met ?? 5.0;
  const kcal = met * safeWeight * (durationSeconds / 3600);
  return Math.round(kcal * 10) / 10;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) {
    return "--'--\"";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}'${String(secs).padStart(2, '0')}"`;
}

export function formatSpeedKmh(mps: number | null | undefined): string {
  if (!mps || !isFinite(mps) || mps < 0) return '0.0';
  return (mps * 3.6).toFixed(1);
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
