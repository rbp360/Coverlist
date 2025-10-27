export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  name?: string;
  username?: string; // unique, case-insensitive
  instruments?: string[];
  avatarUrl?: string;
  // Password reset (optional, used for standard reset flow)
  passwordResetToken?: string;
  passwordResetExpiresAt?: number; // epoch ms
  spotify?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // epoch ms
    scope?: string;
    tokenType?: string; // typically 'Bearer'
  };
};

export type DB = {
  users: User[];
  projects: Project[];
  songs: Song[];
  setlists: Setlist[];
  invites: Invite[];
  repertoireSongs?: RepertoireSong[];
  projectMembers?: ProjectMember[];
  projectPractice?: PracticeEntry[];
  joinRequests?: JoinRequest[];
  settings: Settings;
};

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  avatarUrl?: string;
};

export type Song = {
  id: string; // internal id
  projectId: string;
  title: string;
  artist: string;
  durationSec?: number;
  mbid?: string; // MusicBrainz recording id if available
  isrc?: string; // International Standard Recording Code (from MusicBrainz recording)
  key?: string;
  tempo?: number;
  transposedKey?: string;
  notes?: string;
  url?: string; // streaming link
  createdAt: string;
  updatedAt: string;
};

export type RepertoireSong = {
  id: string;
  userId: string;
  title: string;
  artist: string;
  durationSec?: number;
  mbid?: string;
  isrc?: string;
  key?: string;
  tempo?: number;
  notes?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
};

export type SetlistItem = {
  id: string;
  type: 'song' | 'break' | 'note' | 'section';
  order: number;
  songId?: string; // when type === 'song'
  title?: string; // for break/title override
  artist?: string; // optional display override
  durationSec?: number; // for break or override
  note?: string; // when type === 'note'
  transposedKey?: string; // per-item override when type === 'song'
};

export type Setlist = {
  id: string;
  projectId: string;
  name: string;
  showArtist: boolean;
  showKey?: boolean; // if true, display base key in list meta
  showTransposedKey?: boolean;
  songGapSec?: number; // seconds gap to apply between songs when enabled
  items: SetlistItem[];
  date?: string; // ISO date for the show
  venue?: string;
  time?: string; // e.g., 20:00
  addGapAfterEachSong?: boolean;
  public?: boolean; // if true, discoverable by anyone
  hideItemDurations?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Invite = {
  id: string;
  projectId: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string; // userId of inviter
  createdAt: string;
  updatedAt: string;
  // Role the invite assigns upon acceptance. Defaults to 'bandMember' if omitted for legacy invites
  role?: ProjectRoleInvite;
};

export type JoinRequest = {
  id: string;
  projectId: string;
  userId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  instruments: string[]; // instruments selected for this project
  // Role within the project for this user (owner is implicitly 'bandLeader')
  role?: ProjectRoleNonOwner;
};

export type PracticeEntry = {
  projectId: string;
  songId: string;
  userId: string;
  passes: number; // how many times practiced
  rating: 0 | 1 | 2 | 3 | 4 | 5; // 0 = unrated
  // ISO date string (YYYY-MM-DD) of the last time this user rehearsed this song
  // Optional: if missing, no RAG color is applied in UI
  lastRehearsed?: string;
};

export type Settings = {
  // Global default gap to apply after each song when enabled on a setlist
  defaultSongGapSec: number; // 20 - 120
  // Enrichment config
  enrichmentMode?: 'none' | 'stub';
  enrichOnImport?: boolean; // if true, enrich key/tempo on song import
};

// Project roles
export type ProjectRole = 'bandLeader' | 'bandMember' | 'setlistViewer';
// Non-owner assignable roles
export type ProjectRoleNonOwner = Exclude<ProjectRole, 'bandLeader'>; // 'bandMember' | 'setlistViewer'
// Allowed invite roles
export type ProjectRoleInvite = ProjectRoleNonOwner;
