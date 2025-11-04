/* eslint-disable import/order */
import fs from 'fs';
import path from 'path';
import { firestore as adminFirestore } from './firebaseAdmin';

import {
  User,
  DB,
  ProjectMember,
  PracticeEntry,
  RepertoireSong,
  JoinRequest,
  ProjectRole,
  ProjectRoleNonOwner,
  ProjectTodoItem,
} from './types';

// Choose a writable data directory.
// - Local/dev & CI: default to <repo>/data
// - Vercel serverless: the filesystem is read-only except for /tmp, so use /tmp/data to avoid crashes
// - You can override via DATA_DIR env var in Docker/VM deploys.
const DATA_DIR = (() => {
  const override = process.env.DATA_DIR;
  if (override && override.trim()) return path.resolve(override);
  const isVercel = process.env.VERCEL === '1' || process.env.NOW === '1';
  return isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
})();
const DB_FILE = path.join(DATA_DIR, 'db.json');
const USE_FIRESTORE_MIRROR = (process.env.DATA_BACKEND || '').toLowerCase() === 'firestore';
const FIRESTORE_DOC_PATH = process.env.FIRESTORE_DB_DOC || 'coverlist/db';

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    // Try to seed from a bundled repo snapshot at <repo>/data/db.json when available.
    // On Vercel, we write to /tmp/data but can read a read-only seed from the build output.
    const seedPath = path.join(process.cwd(), 'data', 'db.json');
    try {
      if (fs.existsSync(seedPath)) {
        const seedRaw = fs.readFileSync(seedPath, 'utf-8');
        const seed = JSON.parse(seedRaw) as DB;
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
        return;
      }
    } catch {
      // fall through to create an empty initial DB
    }
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
  parsed.repertoireSongs = parsed.repertoireSongs || [];
  parsed.projectMembers = parsed.projectMembers || [];
  parsed.projectPractice = parsed.projectPractice || [];
  parsed.personalPractice = parsed.personalPractice || [];
  parsed.joinRequests = parsed.joinRequests || [];
  parsed.projectTodo = parsed.projectTodo || [];
  parsed.settings = parsed.settings || { defaultSongGapSec: 30 };
  if (parsed.settings.defaultSongGapSec == null) parsed.settings.defaultSongGapSec = 30;
  if (parsed.settings.enrichmentMode == null) parsed.settings.enrichmentMode = 'stub';
  if (parsed.settings.enrichOnImport == null) parsed.settings.enrichOnImport = false;
  // Backfill setlist defaults
  parsed.setlists = (parsed.setlists || []).map((s: any) => ({
    ...s,
    public: s.public ?? false,
    showKey: s.showKey ?? false,
    songGapSec: s.songGapSec ?? undefined,
    showNotesAfterLyrics: s.showNotesAfterLyrics ?? false,
    showColourFlip: s.showColourFlip ?? false,
    showWhatWhere: s.showWhatWhere ?? false,
    showLiveClock: s.showLiveClock ?? false,
  }));
  return parsed as DB;
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  // Mirror to Firestore (best-effort, non-blocking) when configured and admin SDK is initialized
  if (USE_FIRESTORE_MIRROR && adminFirestore) {
    try {
      const [col, doc] = FIRESTORE_DOC_PATH.split('/');
      if (col && doc)
        void adminFirestore
          .collection(col)
          .doc(doc)
          .set(db as any)
          .catch(() => {});
    } catch {}
  }
}

export const db = {
  // Migrate all references from an old user id to a new user id (e.g., legacy -> Firebase uid)
  migrateUserId(oldUserId: string, newUserId: string) {
    if (!oldUserId || !newUserId || oldUserId === newUserId) return;
    const d = readDB();
    // Users
    const uIdx = d.users.findIndex((u) => u.id === oldUserId);
    if (uIdx !== -1) {
      const existingNewIdx = d.users.findIndex((u) => u.id === newUserId);
      if (existingNewIdx !== -1 && existingNewIdx !== uIdx) {
        // Merge basic fields; prefer non-empty values
        const oldU = d.users[uIdx] as any;
        const newU = d.users[existingNewIdx] as any;
        const merged = {
          ...newU,
          email: newU.email || oldU.email,
          username: newU.username || oldU.username,
          name: newU.name || oldU.name,
          avatarUrl: newU.avatarUrl || oldU.avatarUrl,
          passwordHash: newU.passwordHash || oldU.passwordHash,
          spotify: newU.spotify || oldU.spotify,
          createdAt: newU.createdAt || oldU.createdAt,
        };
        d.users[existingNewIdx] = { ...merged, id: newUserId } as any;
        // Remove the old entry
        d.users.splice(uIdx, 1);
      } else {
        d.users[uIdx] = { ...(d.users[uIdx] as any), id: newUserId } as any;
      }
    }
    // Projects owner/member references
    for (const p of d.projects) {
      if (p.ownerId === oldUserId) p.ownerId = newUserId;
      if (Array.isArray(p.memberIds)) {
        p.memberIds = p.memberIds.map((m) => (m === oldUserId ? newUserId : m));
        // de-dup if new id already present
        p.memberIds = Array.from(new Set(p.memberIds));
      }
    }
    // ProjectMembers entries
    if (Array.isArray((d as any).projectMembers)) {
      (d as any).projectMembers = (d as any).projectMembers.map((pm: any) =>
        pm.userId === oldUserId ? { ...pm, userId: newUserId } : pm,
      );
    }
    // Project practice
    if (Array.isArray((d as any).projectPractice)) {
      (d as any).projectPractice = (d as any).projectPractice.map((pe: any) =>
        pe.userId === oldUserId ? { ...pe, userId: newUserId } : pe,
      );
    }
    // Personal practice
    if (Array.isArray((d as any).personalPractice)) {
      (d as any).personalPractice = (d as any).personalPractice.map((pe: any) =>
        pe.userId === oldUserId ? { ...pe, userId: newUserId } : pe,
      );
    }
    // Repertoire
    if (Array.isArray((d as any).repertoireSongs)) {
      (d as any).repertoireSongs = (d as any).repertoireSongs.map((rs: any) =>
        rs.userId === oldUserId ? { ...rs, userId: newUserId } : rs,
      );
    }
    // Join requests
    if (Array.isArray((d as any).joinRequests)) {
      (d as any).joinRequests = (d as any).joinRequests.map((jr: any) =>
        jr.userId === oldUserId ? { ...jr, userId: newUserId } : jr,
      );
    }
    // Project todo votes map keyed by userId
    if (Array.isArray((d as any).projectTodo)) {
      (d as any).projectTodo = (d as any).projectTodo.map((t: any) => {
        if (!t.votes) return t;
        if (Object.prototype.hasOwnProperty.call(t.votes, oldUserId)) {
          const nextVotes = { ...t.votes } as Record<string, 'yes' | 'no'>;
          const vote = nextVotes[oldUserId];
          delete nextVotes[oldUserId];
          // Do not overwrite an existing newUserId vote if present
          if (!Object.prototype.hasOwnProperty.call(nextVotes, newUserId)) {
            nextVotes[newUserId] = vote;
          }
          return { ...t, votes: nextVotes };
        }
        return t;
      });
    }
    writeDB(d);
  },
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

  // Roles
  getProjectRole(projectId: string, userId: string): ProjectRole | undefined {
    const d = readDB();
    const p = d.projects.find((x) => x.id === projectId);
    if (!p) return undefined;
    if (p.ownerId === userId) return 'bandLeader';
    if (p.memberIds.includes(userId)) return 'bandMember';
    const pm = (d.projectMembers || []).find(
      (x) => x.projectId === projectId && x.userId === userId,
    );
    return pm?.role;
  },
  setMemberRole(projectId: string, userId: string, role: ProjectRoleNonOwner) {
    const d = readDB();
    const list = d.projectMembers || (d.projectMembers = []);
    const idx = list.findIndex((pm) => pm.projectId === projectId && pm.userId === userId);
    const base: ProjectMember = {
      projectId,
      userId,
      instruments: idx !== -1 && Array.isArray(list[idx].instruments) ? list[idx].instruments : [],
      role,
    };
    if (idx === -1) list.push(base);
    else list[idx] = { ...list[idx], role } as ProjectMember;
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
    patch: Partial<Pick<PracticeEntry, 'passes' | 'rating' | 'lastRehearsed'>>,
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
        lastRehearsed:
          patch.lastRehearsed && patch.lastRehearsed.trim()
            ? patch.lastRehearsed.trim()
            : undefined,
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
        lastRehearsed:
          patch.lastRehearsed != null
            ? patch.lastRehearsed.trim() || undefined
            : curr.lastRehearsed,
      };
      list[idx] = next;
      writeDB(d);
      return next;
    }
  },

  // Personal (per-user) repertoire practice entries
  listPersonalPracticeForUser(userId: string) {
    const d = readDB();
    return (d.personalPractice || []).filter((p) => p.userId === userId);
  },
  getPersonalPracticeEntry(repertoireSongId: string, userId: string) {
    const d = readDB();
    return (d.personalPractice || []).find(
      (p) => p.repertoireSongId === repertoireSongId && p.userId === userId,
    );
  },
  upsertPersonalPractice(
    repertoireSongId: string,
    userId: string,
    patch: Partial<{ passes: number; rating: 0 | 1 | 2 | 3 | 4 | 5; lastRehearsed?: string }>,
  ) {
    const d = readDB();
    const list = d.personalPractice || (d.personalPractice = []);
    const idx = list.findIndex(
      (p) => p.repertoireSongId === repertoireSongId && p.userId === userId,
    );
    if (idx === -1) {
      const created = {
        repertoireSongId,
        userId,
        passes: patch.passes ?? 0,
        rating: (patch.rating ?? 0) as 0 | 1 | 2 | 3 | 4 | 5,
        lastRehearsed:
          patch.lastRehearsed && patch.lastRehearsed.trim()
            ? patch.lastRehearsed.trim()
            : undefined,
      } as const;
      list.push(created as any);
      writeDB(d);
      return created;
    } else {
      const curr = list[idx] as any;
      const next = {
        ...curr,
        passes: patch.passes != null ? Math.max(0, patch.passes) : curr.passes,
        rating: (patch.rating != null ? Math.max(0, Math.min(5, patch.rating)) : curr.rating) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5,
        lastRehearsed:
          patch.lastRehearsed != null
            ? patch.lastRehearsed.trim() || undefined
            : curr.lastRehearsed,
      };
      list[idx] = next as any;
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
  // Repertoire (global, per-user)
  listRepertoire(userId: string): RepertoireSong[] {
    const d = readDB();
    return (d.repertoireSongs || []).filter((s) => s.userId === userId);
  },
  createRepertoireSong(song: RepertoireSong) {
    const d = readDB();
    const list = d.repertoireSongs || (d.repertoireSongs = []);
    list.push(song);
    writeDB(d);
  },
  updateRepertoireSong(song: RepertoireSong) {
    const d = readDB();
    const list = d.repertoireSongs || (d.repertoireSongs = []);
    const idx = list.findIndex((s) => s.id === song.id && s.userId === song.userId);
    if (idx !== -1) {
      list[idx] = song;
      writeDB(d);
    }
  },
  deleteRepertoireSong(userId: string, id: string) {
    const d = readDB();
    const before = (d.repertoireSongs || []).length;
    d.repertoireSongs = (d.repertoireSongs || []).filter(
      (s: RepertoireSong) => !(s.userId === userId && s.id === id),
    );
    if ((d.repertoireSongs || []).length !== before) writeDB(d);
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
  getUserByUsername(username: string): User | undefined {
    const d = readDB();
    const un = username.toLowerCase();
    return d.users.find((u) => (u.username || '').toLowerCase() === un);
  },
  // Password reset helpers
  setUserPasswordReset(userId: string, token: string, expiresAt: number) {
    const d = readDB();
    const idx = d.users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    d.users[idx] = {
      ...d.users[idx],
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    } as User;
    writeDB(d);
    return true;
  },
  getUserByPasswordResetToken(token: string): User | undefined {
    const d = readDB();
    return d.users.find((u) => u.passwordResetToken === token);
  },
  clearUserPasswordReset(userId: string) {
    const d = readDB();
    const idx = d.users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    const { passwordResetToken, passwordResetExpiresAt, ...rest } = d.users[idx] as any;
    d.users[idx] = rest as User;
    writeDB(d);
    return true;
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
  listInvitesForEmail(email: string) {
    const d = readDB();
    const em = email.toLowerCase();
    return d.invites.filter((i) => i.email.toLowerCase() === em);
  },
  // Join Requests
  listJoinRequestsForProject(projectId: string): JoinRequest[] {
    const d = readDB();
    return (d.joinRequests || []).filter((jr) => jr.projectId === projectId);
  },
  listJoinRequestsForUser(userId: string): JoinRequest[] {
    const d = readDB();
    return (d.joinRequests || []).filter((jr) => jr.userId === userId);
  },
  getJoinRequestByProjectAndUser(projectId: string, userId: string): JoinRequest | undefined {
    const d = readDB();
    return (d.joinRequests || []).find((jr) => jr.projectId === projectId && jr.userId === userId);
  },
  createJoinRequest(jr: JoinRequest) {
    const d = readDB();
    const list = d.joinRequests || (d.joinRequests = []);
    list.push(jr);
    writeDB(d);
  },
  updateJoinRequest(jr: JoinRequest) {
    const d = readDB();
    const list = d.joinRequests || (d.joinRequests = []);
    const idx = list.findIndex((x) => x.id === jr.id);
    if (idx !== -1) {
      list[idx] = jr;
      writeDB(d);
    }
  },

  // Project To-Do items
  listProjectTodo(projectId: string): ProjectTodoItem[] {
    const d = readDB();
    return (d.projectTodo || []).filter((t) => t.projectId === projectId);
  },
  getProjectTodoById(projectId: string, id: string): ProjectTodoItem | undefined {
    const d = readDB();
    return (d.projectTodo || []).find((t) => t.projectId === projectId && t.id === id);
  },
  addProjectTodo(item: ProjectTodoItem) {
    const d = readDB();
    const list = d.projectTodo || (d.projectTodo = []);
    // Prevent duplicate suggestions by identity (mbid or normalized title|artist)
    const norm = (s: string) => s.trim().toLowerCase();
    const identity = item.mbid || `${norm(item.title)}|${norm(item.artist)}`;
    const hasDuplicate = list.some((t) => {
      const tIdentity = t.mbid || `${norm(t.title)}|${norm(t.artist)}`;
      return t.projectId === item.projectId && tIdentity === identity;
    });
    if (!hasDuplicate) {
      list.push(item as any);
      writeDB(d);
    }
  },
  addManyProjectTodo(projectId: string, items: ProjectTodoItem[]) {
    const d = readDB();
    const list = d.projectTodo || (d.projectTodo = []);
    const norm = (s: string) => s.trim().toLowerCase();
    for (const item of items) {
      const identity = item.mbid || `${norm(item.title)}|${norm(item.artist)}`;
      const hasDuplicate = list.some((t) => {
        const tIdentity = t.mbid || `${norm(t.title)}|${norm(t.artist)}`;
        return t.projectId === projectId && tIdentity === identity;
      });
      if (!hasDuplicate) list.push(item);
    }
    writeDB(d);
  },
  deleteProjectTodo(projectId: string, id: string) {
    const d = readDB();
    const before = (d.projectTodo || []).length;
    d.projectTodo = (d.projectTodo || []).filter(
      (t) => !(t.projectId === projectId && t.id === id),
    );
    if ((d.projectTodo || []).length !== before) writeDB(d);
  },
  updateProjectTodo(
    projectId: string,
    id: string,
    patch: Partial<Pick<ProjectTodoItem, 'notes' | 'url'>>,
  ): ProjectTodoItem | undefined {
    const d = readDB();
    const list = d.projectTodo || (d.projectTodo = []);
    const idx = list.findIndex((t) => t.projectId === projectId && t.id === id);
    if (idx === -1) return undefined;
    const next: ProjectTodoItem = { ...list[idx], ...patch } as ProjectTodoItem;
    list[idx] = next;
    writeDB(d);
    return next;
  },
  setProjectTodoVote(
    projectId: string,
    id: string,
    userId: string,
    vote: 'yes' | 'no' | null,
  ): ProjectTodoItem | undefined {
    const d = readDB();
    const list = d.projectTodo || (d.projectTodo = []);
    const idx = list.findIndex((t) => t.projectId === projectId && t.id === id);
    if (idx === -1) return undefined;
    const curr = list[idx];
    const votes = { ...(curr.votes || {}) } as NonNullable<ProjectTodoItem['votes']>;
    if (!vote) {
      delete votes[userId];
    } else {
      votes[userId] = vote;
    }
    const next: ProjectTodoItem = { ...curr, votes } as ProjectTodoItem;
    list[idx] = next;
    writeDB(d);
    return next;
  },
};
