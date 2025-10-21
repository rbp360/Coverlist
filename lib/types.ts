export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Entry = {
  id: string;
  userId: string;
  location: string;
  item: string;
  price: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DB = {
  users: User[];
  entries: Entry[];
  projects: Project[];
  songs: Song[];
  setlists: Setlist[];
  invites: Invite[];
  settings: Settings;
};

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
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
};

export type Setlist = {
  id: string;
  projectId: string;
  name: string;
  showArtist: boolean;
  items: SetlistItem[];
  date?: string; // ISO date for the show
  venue?: string;
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

export type Settings = {
  // Global default gap to apply after each song when enabled on a setlist
  defaultSongGapSec: number; // 20 - 120
};
