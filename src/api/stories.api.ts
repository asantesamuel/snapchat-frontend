import { apiClient } from './client';
import type { Story, StoryFeed, PublishStoryDto } from '@/types/story.types';

export const storiesApi = {
  publish: (dto: PublishStoryDto) =>
    apiClient.post<Story>('/api/stories', dto).then(r => r.data),

  getFeed: () =>
    apiClient.get<StoryFeed>('/api/stories/feed').then(r => r.data),

  getMyStories: () =>
    apiClient.get<Story[]>('/api/stories/me').then(r => r.data),

  view: (storyId: string) =>
    apiClient.post<Story>(`/api/stories/${storyId}/view`).then(r => r.data),

  delete: (storyId: string) =>
    apiClient.delete<{ message: string }>(`/api/stories/${storyId}`)
      .then(r => r.data),
};