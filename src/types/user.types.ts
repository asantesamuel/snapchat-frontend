export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bioText: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bioText: string | null;
}

export interface UpdateProfileDto {
  username?: string;
  bioText?: string;
}

export interface SearchResult {
  users: PublicProfile[];
  total: number;
}