import fs from 'fs';
import path from 'path';

import { Entry, User, DB } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    const initial: DB = {
      users: [],
      entries: [],
      projects: [],
      songs: [],
      setlists: [],
      invites: [],
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
  parsed.entries = parsed.entries || [];
  parsed.projects = parsed.projects || [];
  parsed.songs = parsed.songs || [];
  parsed.setlists = parsed.setlists || [];
  parsed.invites = parsed.invites || [];
  return parsed as DB;
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export const db = {
  getUserByEmail(email: string): User | undefined {
    const d = readDB();
    return d.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  // Projects
  listProjects(userId: string) {
    const d = readDB();
    return d.projects.filter((p) => p.ownerId === userId || p.memberIds.includes(userId));
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
  addProjectMember(projectId: string, userId: string) {
    const d = readDB();
    const p = d.projects.find((x) => x.id === projectId);
    if (p && !p.memberIds.includes(userId)) p.memberIds.push(userId);
    writeDB(d);
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
  getUserById(id: string): User | undefined {
    const d = readDB();
    return d.users.find((u) => u.id === id);
  },
  createUser(user: User) {
    const d = readDB();
    d.users.push(user);
    writeDB(d);
  },
  listEntries(userId: string): Entry[] {
    const d = readDB();
    return d.entries.filter((e) => e.userId === userId);
  },
  getEntry(id: string, userId: string): Entry | undefined {
    const d = readDB();
    return d.entries.find((e) => e.id === id && e.userId === userId);
  },
  createEntry(entry: Entry) {
    const d = readDB();
    d.entries.push(entry);
    writeDB(d);
  },
  updateEntry(entry: Entry) {
    const d = readDB();
    const idx = d.entries.findIndex((e) => e.id === entry.id && e.userId === entry.userId);
    if (idx !== -1) {
      d.entries[idx] = entry;
      writeDB(d);
    }
  },
  deleteEntry(id: string, userId: string) {
    const d = readDB();
    d.entries = d.entries.filter((e) => !(e.id === id && e.userId === userId));
    writeDB(d);
  },
  // Setlists
  listSetlists(projectId: string) {
    const d = readDB();
    return d.setlists.filter((s) => s.projectId === projectId);
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
