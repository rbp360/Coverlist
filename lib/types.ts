export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  name?: string;
  instruments?: string[];
  avatarUrl?: string;
};

export type DB = {
  users: User[];
  projects: Project[];
  songs: Song[];
  setlists: Setlist[];
  invites: Invite[];
  projectMembers?: ProjectMember[];
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
  key?: string;
  tempo?: number;
  transposedKey?: string;
  notes?: string;
  url?: string; // streaming link
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
  showTransposedKey?: boolean;
  items: SetlistItem[];
  date?: string; // ISO date for the show
  venue?: string;
  time?: string; // e.g., 20:00
  addGapAfterEachSong?: boolean;
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
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  instruments: string[]; // instruments selected for this project
};

export type Settings = {
  // Global default gap to apply after each song when enabled on a setlist
  defaultSongGapSec: number; // 20 - 120
  // Enrichment config
  enrichmentMode?: 'none' | 'stub';
  enrichOnImport?: boolean; // if true, enrich key/tempo on song import
};
