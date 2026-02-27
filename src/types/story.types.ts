export enum StoryType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum StoryVisibility {
  PUBLIC = 'public',
  CUSTOM = 'custom',
}

export interface StoryAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface Story {
  id: string;
  author: StoryAuthor;
  mediaUrl: string;
  storyType: StoryType;
  visibility: StoryVisibility;
  caption: string | null;
  duration: number | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  secondsRemaining: number;
  hasViewed: boolean;
}

export interface StoryGroup {
  author: StoryAuthor;
  stories: Story[];
  allViewed: boolean;
}

export interface StoryFeed {
  stories: StoryGroup[];
  total: number;
}

export interface PublishStoryDto {
  mediaUrl: string;
  s3Key: string;
  storyType: StoryType;
  caption?: string;
  duration?: number;
  visibility: StoryVisibility;
  allowedViewerUsernames?: string[];
}