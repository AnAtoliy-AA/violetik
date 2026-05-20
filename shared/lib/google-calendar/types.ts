export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkingWindow {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface BusyWindow {
  start: Date;
  end: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  email?: string;
}

export interface SlotComputationInput {
  workingHours: WorkingWindow[];
  busy: BusyWindow[];
  serviceDurationMin: number;
  dayISO: string;
  timeZone: string;
  granularityMin?: number;
}
