export enum GroupMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface GroupMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  members: GroupMember[];
}

export interface CreateGroupDto {
  name: string;
  memberUsernames: string[];
}

export interface AddMemberDto {
  username: string;
}