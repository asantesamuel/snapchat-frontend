import { apiClient } from './client';
import type { Group, CreateGroupDto, AddMemberDto } from '@/types/group.types';

export const groupsApi = {
  create: (dto: CreateGroupDto) =>
    apiClient.post<Group>('/api/groups', dto).then(r => r.data),

  get: (groupId: string) =>
    apiClient.get<Group>(`/api/groups/${groupId}`).then(r => r.data),

  addMember: (groupId: string, dto: AddMemberDto) =>
    apiClient.post<Group>(`/api/groups/${groupId}/members`, dto)
      .then(r => r.data),

  removeMember: (groupId: string, userId: string) =>
    apiClient.delete<{ message: string }>(
      `/api/groups/${groupId}/members/${userId}`
    ).then(r => r.data),
};