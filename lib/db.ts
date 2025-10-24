import fs from 'fs';
import path from 'path';

import { User, DB, ProjectMember, PracticeEntry } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    const initial: DB = {
      users: [],
      projects: [],
      songs: [],
      setlists: [],
      invites: [],
      settings: { defaultSongGapSec: 30, enrichmentMode: 'stub', enrichOnImport: false },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDB(): DB {
  ensureDB();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as any;
  // Backfill missing arrays for older files
  parsed.users = parsed.users || [];
  parsed.projects = parsed.projects || [];
  parsed.songs = parsed.songs || [];
  parsed.setlists = parsed.setlists || [];
  parsed.invites = parsed.invites || [];
  parsed.projectMembers = parsed.projectMembers || [];
  parsed.projectPractice = parsed.projectPractice || [];
  parsed.settings = parsed.settings || { defaultSongGapSec: 30 };
  if (parsed.settings.defaultSongGapSec == null) parsed.settings.defaultSongGapSec = 30;
  if (parsed.settings.enrichmentMode == null) parsed.settings.enrichmentMode = 'stub';
  if (parsed.settings.enrichOnImport == null) parsed.settings.enrichOnImport = false;
  // Backfill setlist.public default to false
  parsed.setlists = (parsed.setlists || []).map((s: any) => ({
    ...s,
    public: s.public ?? false,
  }));
  return parsed as DB;
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export const db = {
  // Settings
  getSettings() {
    const d = readDB();
    return d.settings;
  },
  updateSettings(next: Partial<DB['settings']>) {
    const d = readDB();
    d.settings = { ...d.settings, ...next };
    writeDB(d);
  },
  getUserByEmail(email: string): User | undefined {
    const d = readDB();
    return d.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  // Projects
  listProjects(userId: string) {
    const d = readDB();
    return d.projects.filter((p) => p.ownerId === userId || p.memberIds.includes(userId));
  },
  getProjectById(id: string) {
    const d = readDB();
    return d.projects.find((p) => p.id === id);
  },
  getProject(id: string, userId: string) {
    const d = readDB();
    return d.projects.find(
      (p) => p.id === id && (p.ownerId === userId || p.memberIds.includes(userId)),
    );
  },
  createProject(project: DB['projects'][number]) {
    const d = readDB();
    d.projects.push(project);
    writeDB(d);
  },
  updateProject(project: DB['projects'][number]) {
    const d = readDB();
    const idx = d.projects.findIndex((p) => p.id === project.id);
    if (idx !== -1) {
      d.projects[idx] = project;
      writeDB(d);
    }
  },
  addProjectMember(projectId: string, userId: string) {
    const d = readDB();
    const p = d.projects.find((x) => x.id === projectId);
    if (p && !p.memberIds.includes(userId)) p.memberIds.push(userId);
    writeDB(d);
  },

  // Project member instruments
  listProjectMemberEntries(projectId: string): ProjectMember[] {
    const d = readDB();
    return (d.projectMembers || []).filter((pm) => pm.projectId === projectId);
  },
  getMemberInstruments(projectId: string, userId: string): string[] {
    const d = readDB();
    const entry = (d.projectMembers || []).find(
      (pm) => pm.projectId === projectId && pm.userId === userId,
    );
    return entry?.instruments || [];
  },
  setMemberInstruments(projectId: string, userId: string, instruments: string[]) {
    const d = readDB();
    const list = d.projectMembers || (d.projectMembers = []);
    const idx = list.findIndex((pm) => pm.projectId === projectId && pm.userId === userId);
    const next: ProjectMember = { projectId, userId, instruments };
    if (idx === -1) list.push(next);
    else list[idx] = next;
    writeDB(d);
  },

  // Rehearsal practice entries
  listPracticeForUser(projectId: string, userId: string): PracticeEntry[] {
    const d = readDB();
    return (d.projectPractice || []).filter(
      (p) => p.projectId === projectId && p.userId === userId,
    );
  },
  getPracticeEntry(projectId: string, songId: string, userId: string): PracticeEntry | undefined {
    const d = readDB();
    return (d.projectPractice || []).find(
      (p) => p.projectId === projectId && p.songId === songId && p.userId === userId,
    );
  },
  upsertPractice(
    projectId: string,
    songId: string,
    userId: string,
    patch: Partial<Pick<PracticeEntry, 'passes' | 'rating'>>,
  ): PracticeEntry {
    const d = readDB();
    const list = d.projectPractice || (d.projectPractice = []);
    const idx = list.findIndex(
      (p) => p.projectId === projectId && p.songId === songId && p.userId === userId,
    );
    if (idx === -1) {
      const created: PracticeEntry = {
        projectId,
        songId,
        userId,
        passes: patch.passes ?? 0,
        rating: (patch.rating ?? 0) as PracticeEntry['rating'],
      };
      list.push(created);
      writeDB(d);
      return created;
    } else {
      const curr = list[idx];
      const next: PracticeEntry = {
        ...curr,
        passes: patch.passes != null ? Math.max(0, patch.passes) : curr.passes,
        rating: (patch.rating != null
          ? Math.max(0, Math.min(5, patch.rating))
          : curr.rating) as PracticeEntry['rating'],
      };
      list[idx] = next;
      writeDB(d);
      return next;
    }
  },

  // Songs
  listSongs(projectId: string) {
    const d = readDB();
    return d.songs.filter((s) => s.projectId === projectId);
  },
  createSong(song: DB['songs'][number]) {
    const d = readDB();
    d.songs.push(song);
    writeDB(d);
  },
  updateSong(song: DB['songs'][number]) {
    const d = readDB();
    const idx = d.songs.findIndex((s) => s.id === song.id);
    if (idx !== -1) {
      d.songs[idx] = song;
      writeDB(d);
    }
  },
  deleteSong(id: string) {
    const d = readDB();
    const before = d.songs.length;
    d.songs = d.songs.filter((s) => s.id !== id);
    if (d.songs.length !== before) writeDB(d);
  },
  getUserById(id: string): User | undefined {
    const d = readDB();
    return d.users.find((u) => u.id === id);
  },
  listUsers() {
    const d = readDB();
    return d.users;
  },
  createUser(user: User) {
    const d = readDB();
    d.users.push(user);
    writeDB(d);
  },
  updateUser(user: User) {
    const d = readDB();
    const idx = d.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      d.users[idx] = user;
      writeDB(d);
    }
  },
  // User integrations
  getUserSpotify(userId: string) {
    const d = readDB();
    const u = d.users.find((x) => x.id === userId);
    return u?.spotify;
  },
  setUserSpotify(userId: string, spotify: NonNullable<User['spotify']>) {
    const d = readDB();
    const idx = d.users.findIndex((u) => u.id === userId);
    if (idx === -1) return;
    d.users[idx] = { ...d.users[idx], spotify } as User;
    writeDB(d);
  },
  // Setlists
  listSetlists(projectId: string) {
    const d = readDB();
    return d.setlists.filter((s) => s.projectId === projectId);
  },
  listPublicSetlists() {
    const d = readDB();
    return d.setlists.filter((s) => !!s.public);
  },
  getSetlist(id: string) {
    const d = readDB();
    return d.setlists.find((s) => s.id === id);
  },
  createSetlist(setlist: DB['setlists'][number]) {
    const d = readDB();
    d.setlists.push(setlist);
    writeDB(d);
  },
  updateSetlist(setlist: DB['setlists'][number]) {
    const d = readDB();
    const idx = d.setlists.findIndex((s) => s.id === setlist.id);
    if (idx !== -1) {
      d.setlists[idx] = setlist;
      writeDB(d);
    }
  },
  deleteSetlist(id: string) {
    const d = readDB();
    d.setlists = d.setlists.filter((s) => s.id !== id);
    writeDB(d);
  },
  // Invites
  listInvites(projectId: string) {
    const d = readDB();
    return d.invites.filter((i) => i.projectId === projectId);
  },
  createInvite(invite: DB['invites'][number]) {
    const d = readDB();
    d.invites.push(invite);
    writeDB(d);
  },
  updateInvite(invite: DB['invites'][number]) {
    const d = readDB();
    const idx = d.invites.findIndex((i) => i.id === invite.id);
    if (idx !== -1) {
      d.invites[idx] = invite;
      writeDB(d);
    }
  },
  getInviteById(id: string) {
    const d = readDB();
    return d.invites.find((i) => i.id === id);
  },
  getInviteByToken(token: string) {
    const d = readDB();
    return d.invites.find((i) => i.token === token);
  },
};
