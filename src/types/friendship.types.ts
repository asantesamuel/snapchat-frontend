export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

export interface Friendship {
  id: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  status: FriendshipStatus;
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  status: string;
  createdAt: string;
}