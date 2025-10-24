import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const projectCreateSchema = z.object({ name: z.string().min(1) });

export const songImportSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  durationSec: z.number().optional(),
  mbid: z.string().optional(),
});

export const searchQuerySchema = z.object({ q: z.string().min(2) });

const setlistItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['song', 'break', 'note', 'section']),
  order: z.number().int().nonnegative().optional(),
  songId: z.string().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  transposedKey: z.string().optional(),
});

export const setlistCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  showArtist: z.boolean().default(true),
  showTransposedKey: z.boolean().optional(),
  items: z.array(setlistItemSchema).optional(),
  date: z.string().optional(),
  venue: z.string().optional(),
  time: z.string().optional(),
  addGapAfterEachSong: z.boolean().optional(),
  public: z.boolean().optional(),
});

export const setlistUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  showArtist: z.boolean().optional(),
  showTransposedKey: z.boolean().optional(),
  items: z
    .array(setlistItemSchema.extend({ id: z.string(), order: z.number().int().nonnegative() }))
    .optional(),
  date: z.string().optional(),
  venue: z.string().optional(),
  time: z.string().optional(),
  addGapAfterEachSong: z.boolean().optional(),
  public: z.boolean().optional(),
});

export const settingsSchema = z.object({
  defaultSongGapSec: z.number().int().min(20).max(120),
  enrichmentMode: z.enum(['none', 'stub', 'getSong']).optional(),
  enrichOnImport: z.boolean().optional(),
});

export const settingsUpdateSchema = z.object({
  defaultSongGapSec: z.number().int().min(20).max(120).optional(),
  enrichmentMode: z.enum(['none', 'stub', 'getSong']).optional(),
  enrichOnImport: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  instruments: z.array(z.string()).optional(),
  avatarUrl: z.string().url().optional(),
});

export const projectMemberInstrumentsUpdateSchema = z.object({
  instruments: z.array(z.string()),
});

export const rehearsalUpdateSchema = z.object({
  songId: z.string().min(1),
  passes: z.number().int().min(0).optional(),
  rating: z.number().int().min(0).max(5).optional(),
});
