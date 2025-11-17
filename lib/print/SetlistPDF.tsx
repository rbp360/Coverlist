import { Document, Page, StyleSheet, Text, View, Font, Image } from '@react-pdf/renderer';
import React from 'react';

import type { Project, Setlist, SetlistItem, Song } from '../types';

// Font registration helper using public URLs, works on server and client
let fontsRegisteredBase: string | null = null;
function ensureFonts(baseUrl?: string) {
  const base = (baseUrl || '').replace(/\/?$/, ''); // trim trailing slash
  if (fontsRegisteredBase === base || fontsRegisteredBase === 'embedded') return;

  // Try to embed fonts from filesystem first (more reliable than HTTP fetch during SSR)
  try {
    // Using require to avoid bundling fs/path on the client
    // and to keep compatibility with Node runtime only
    // (this runs only within the server route)
    // @ts-ignore
    const fs = require('fs');
    // @ts-ignore
    const path = require('path');
    const lemonPath = path.join(
      process.cwd(),
      'public',
      'fonts',
      'lemonmilk',
      'LEMONMILK-Bold.otf',
    );
    const fastPath = path.join(process.cwd(), 'public', 'fonts', 'Fasthand', 'Fast Hand.otf');
    const lemonData = fs.readFileSync(lemonPath);
    const fastData = fs.readFileSync(fastPath);
    const lemonDataUrl = `data:font/opentype;base64,${lemonData.toString('base64')}`;
    const fastDataUrl = `data:font/opentype;base64,${fastData.toString('base64')}`;
    Font.register({
      family: 'LemonMilk',
      fonts: [
        { src: lemonDataUrl, fontWeight: 700 },
        { src: lemonDataUrl, fontWeight: 400 },
      ],
    });
    Font.register({ family: 'Fasthand', src: fastDataUrl });
    fontsRegisteredBase = 'embedded';
    return;
  } catch {
    // fall back to HTTP URLs if fs read fails
  }

  try {
    const lemon = encodeURI(`${base}/fonts/lemonmilk/LEMONMILK-Bold.otf`);
    const fast = encodeURI(`${base}/fonts/Fasthand/Fast Hand.otf`);
    Font.register({
      family: 'LemonMilk',
      fonts: [
        { src: lemon, fontWeight: 700 },
        { src: lemon, fontWeight: 400 },
      ],
    });
    Font.register({ family: 'Fasthand', src: fast });
    fontsRegisteredBase = base || 'url';
  } catch {
    // ignore; renderer will fallback if fonts cannot be loaded
  }
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 28,
    fontFamily: 'LemonMilk',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#666',
  },
  header: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', width: 'auto', paddingRight: 8 },
  headerRight: { flex: 1, paddingLeft: 8 },
  logo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  title: { fontSize: 10, fontWeight: 'bold', textAlign: 'right', width: '100%' },
  meta: {
    fontSize: 10,
    color: '#444',
    marginTop: 4,
    textAlign: 'right',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Fasthand',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: 2,
  },
  itemLeft: { flexDirection: 'row', maxWidth: '100%' },
  idx: { fontSize: 10, color: '#666', width: 16, textAlign: 'right', marginRight: 6 },
  songTitle: { fontSize: 11 },
  songMeta: { fontSize: 9, color: '#666' },
  duration: { fontSize: 10, color: '#333' },
  note: { fontSize: 10, color: '#333' },
  break: { fontSize: 11, color: '#111' },
});

export type SetlistPDFProps = {
  project: Project;
  setlist: Setlist;
  songsById: Record<string, Song>;
  defaultSongGapSec: number;
  fontSize?: number; // base font size multiplier (1.0 = default)
  fontBaseUrl?: string; // absolute origin for font loading (e.g., http://localhost:3001)
  fitMode?: 1 | 2 | 'manual';
};

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function displayTitle(setlist: Setlist, item: SetlistItem, song?: Song): string {
  if (item.type === 'song' && song) {
    const title = song.title;
    const baseKey = item.transposedKey || song.transposedKey || song.key;
    const keySuffix = setlist.showTransposedKey && baseKey ? ` (${baseKey})` : '';
    return `${title}${keySuffix}`;
  }
  if (item.type === 'note') return item.note || '';
  if (item.type === 'break') return item.title || 'Break';
  if (item.type === 'section') return item.title || 'Section';
  return '';
}

function itemDurationSeconds(
  setlist: Setlist,
  item: SetlistItem,
  defaultSongGapSec: number,
): number {
  if (item.type === 'song') {
    const dur = item.durationSec || 0;
    return dur + (setlist.addGapAfterEachSong ? defaultSongGapSec : 0);
  }
  return item.durationSec || 0;
}

function formatCreatedDate(iso?: string): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  } catch {
    return '';
  }
}

export default function SetlistPDF({
  project,
  setlist,
  songsById,
  defaultSongGapSec,
  fontSize = 1.0,
  fontBaseUrl,
  fitMode = 'manual',
}: SetlistPDFProps) {
  ensureFonts(fontBaseUrl);
  let scale = Math.max(0.6, Math.min(1.6, fontSize));
  const scaled = (n: number) => Math.round(n * scale);

  const resolveAssetUrl = (src?: string): string | undefined => {
    if (!src) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('SetlistPDF: avatarUrl is missing');
      }
      return undefined;
    }
    if (/^https?:\/\//i.test(src)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('SetlistPDF: avatarUrl is absolute', src);
      }
      return src;
    }
    const base = (fontBaseUrl || '').replace(/\/?$/, '');
    const resolved = base ? encodeURI(`${base}${src.startsWith('/') ? '' : '/'}${src}`) : src;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('SetlistPDF: resolved avatarUrl', resolved);
    }
    return resolved;
  };

  const sanitizeNoteText = (input?: string): string => {
    if (!input) return '';
    let out = input;
    out = out.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
    out = out.replace(/<[^>]*>/g, '');
    out = out.replace(/:[a-zA-Z0-9_+\-]+:/g, '');
    try {
      out = out.replace(/\p{Extended_Pictographic}/gu, '');
    } catch {}
    out = out
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*([\-\*•\u2013\u2014]|\d+[\.)]|[A-Za-z][\)])\s+/, '').trim())
      .join(' ');
    out = out.replace(/\s+/g, ' ').trim();
    return out;
  };

  // Helper to split items by section
  function splitItemsBySections(items: SetlistItem[]) {
    const result: SetlistItem[][] = [];
    let current: SetlistItem[] = [];
    for (const item of items) {
      if (item.type === 'section') {
        if (current.length > 0) result.push(current);
        current = [item];
      } else {
        current.push(item);
      }
    }
    if (current.length > 0) result.push(current);
    return result;
  }
  const groups = splitItemsBySections(setlist.items);

  // Decide pages based on fitMode
  let sets: SetlistItem[][] = [];
  if (fitMode === 'manual' || fitMode === 1) {
    // Font-size mode: paginate by whole sections so sets never cross pages
    const capacityPerPage = 720; // base vertical units per page at scale=1
    const headerSpace = 56; // fixed header + spacer and borders
    const footerSpace = 48; // footer area + breathing room
    const effCapacity = capacityPerPage / Math.max(0.6, Math.min(1.6, scale));
    const unitFor = (item: SetlistItem): number => {
      switch (item.type) {
        case 'section':
          return 36;
        case 'song':
          return 28;
        case 'note':
          return 22;
        case 'break':
          return 20;
        default:
          return 18;
      }
    };
    const groupUnits = (group: SetlistItem[]) => group.reduce((u, it) => u + unitFor(it), 0);

    const pages: SetlistItem[][] = [];
    let current: SetlistItem[] = [];
    let used = headerSpace + footerSpace; // per-page overhead
    for (const grp of groups) {
      const gu = groupUnits(grp);
      const would = used + gu;
      if (current.length === 0) {
        // First group on page always goes in, even if it overflows slightly
        current.push(...grp);
        used = would;
      } else if (would <= effCapacity) {
        current.push(...grp);
        used = would;
      } else {
        pages.push(current);
        current = [...grp];
        used = headerSpace + footerSpace + gu;
      }
    }
    if (current.length) pages.push(current);
    sets = pages.length ? pages : [setlist.items];
  } else if (fitMode === 2) {
    if (groups.length <= 1) {
      sets = [setlist.items];
    } else if (groups.length === 2) {
      sets = [groups[0], groups[1]];
    } else if (groups.length >= 3) {
      // If any section is an Encore, put Set 1 on page 1 and the rest (Set 2 + Encore(s)) on page 2
      const hasEncore = groups.some(
        (g) =>
          g[0]?.type === 'section' && (g[0] as SetlistItem).title?.toLowerCase().includes('encore'),
      );
      if (hasEncore) {
        sets = [groups[0], groups.slice(1).flat()];
      } else {
        const mid = Math.ceil(groups.length / 2);
        sets = [groups.slice(0, mid).flat(), groups.slice(mid).flat()];
      }
    }
  } else {
    // fitMode '1' or 'manual' -> single flow; allow renderer to paginate
    sets = [setlist.items];
  }

  // When fitMode=2, enforce scaling so each page fits onto a single page
  if (fitMode === 2 && sets.length === 2) {
    const capacityPerPage = 720; // conservative usable vertical units per A4 page at scale=1
    const headerSpace = 56; // fixed header + spacer and borders
    const footerSpace = 48; // footer area + breathing room
    const unitFor = (item: SetlistItem): number => {
      switch (item.type) {
        case 'section':
          return 36;
        case 'song':
          return 28;
        case 'note':
          return 22;
        case 'break':
          return 20; // spacer we render for breaks
        default:
          return 18;
      }
    };
    const estimateUnits = (items: SetlistItem[]) => {
      let u = headerSpace + footerSpace;
      for (const it of items) u += unitFor(it);
      return Math.max(1, u);
    };
    const neededScales = sets.map((pg) => {
      const units = estimateUnits(pg);
      const raw = capacityPerPage / units;
      return Math.max(0.6, Math.min(1.6, raw));
    });
    const fitScale = Math.min(...neededScales) * 0.95; // safety margin
    scale = Math.max(0.6, Math.min(scale, fitScale));
  }

  return (
    <Document>
      {sets.map((setItems, pageIdx) => (
        <Page key={pageIdx} size="A4" style={{ ...styles.page, fontSize: scaled(10) }}>
          <View fixed style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                {project.avatarUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    src={resolveAssetUrl(project.avatarUrl) || ''}
                    style={{ ...styles.logo, width: scaled(40), height: scaled(40) }}
                  />
                ) : (
                  <Text style={{ fontSize: scaled(12) }}>{project.name}</Text>
                )}
              </View>
              <View style={styles.headerRight}>
                <Text style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: scaled(12), fontWeight: 'bold' }}>{setlist.name}</Text>
                  {setlist.date || setlist.venue ? (
                    <Text style={{ fontSize: scaled(9), color: '#555' }}>
                      {` — ${setlist.date ? formatCreatedDate(setlist.date) : ''}${setlist.venue ? (setlist.date ? ' • ' : ' ') + setlist.venue : ''}`}
                    </Text>
                  ) : null}
                </Text>
              </View>
            </View>
          </View>

          {/* Spacer to avoid overlap with fixed header */}
          <View style={{ height: scaled(44) }} />

          {setItems.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <Text key={idx} style={{ ...styles.sectionHeader, fontSize: scaled(18) }}>
                  {item.title || 'Section'}
                </Text>
              );
            }
            if (item.type === 'note') {
              return (
                <View
                  key={idx}
                  style={{ ...styles.itemRow, justifyContent: 'flex-end', marginVertical: 1 }}
                >
                  <Text style={{ ...styles.note, fontSize: scaled(10), textAlign: 'right' }}>
                    {sanitizeNoteText(item.note)}
                  </Text>
                </View>
              );
            }
            if (item.type === 'break') {
              // Do not render break details; leave vertical space instead
              return <View key={idx} style={{ height: scaled(16) }} />;
            }
            const song = item.songId ? songsById[item.songId] : undefined;
            return (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View style={{ width: 12 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...styles.songTitle, fontSize: scaled(17), marginRight: 8 }}>
                      {displayTitle(setlist, item, song)}
                    </Text>
                    {song && (
                      <Text style={{ ...styles.songMeta, fontSize: scaled(17) }}>
                        {setlist.showArtist !== false ? song.artist : ''}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.footer}>
            <Text style={{ fontSize: scaled(8), color: '#777' }}>
              Created: {formatCreatedDate(setlist.createdAt)}
            </Text>
            <Text style={{ fontSize: scaled(8), color: '#777', textAlign: 'center' }}>
              {project.name} — {setlist.name}
            </Text>
            <Text style={{ fontSize: scaled(9) }}>
              <Text style={{ color: '#666' }}>generated by </Text>
              <Text style={{ color: '#22c55e' }}>Song</Text>
              <Text style={{ color: '#111' }}>Deck</Text>
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
