export enum ReportType {
  PROFILE = 'profile',
  STORY = 'story',
  MESSAGE = 'message',
  SNAP = 'snap',
  GROUP = 'group',
}

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  NUDITY = 'nudity',
  MISINFORMATION = 'misinformation',
  IMPERSONATION = 'impersonation',
  OTHER = 'other',
}

export interface CreateReportDto {
  reportedUsername?: string;
  reportType: ReportType;
  reportReason: ReportReason;
  contentId?: string;
  description?: string;
}

export interface BlockedUser {
  id: string;
  blockedUsername: string;
  createdAt: string;
}

export interface MutedUser {
  id: string;
  mutedUsername: string;
  muteType: 'stories' | 'chat';
  createdAt: string;
}