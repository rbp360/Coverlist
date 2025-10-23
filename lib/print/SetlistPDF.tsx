import { Document, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer';
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
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', width: '100%' },
  meta: {
    fontSize: 10,
    color: '#444',
    marginTop: 4,
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

export default function SetlistPDF({
  project,
  setlist,
  songsById,
  defaultSongGapSec,
  fontSize = 1.0,
  fontBaseUrl,
}: SetlistPDFProps) {
  ensureFonts(fontBaseUrl);
  const scale = Math.max(0.6, Math.min(1.6, fontSize));
  const scaled = (n: number) => Math.round(n * scale);

  const sanitizeNoteText = (input?: string): string => {
    if (!input) return '';
    let out = input;
    // Remove Markdown images ![alt](url)
    out = out.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
    // Remove HTML tags (e.g., <img .../>)
    out = out.replace(/<[^>]*>/g, '');
    // Remove :emoji: style shortcodes
    out = out.replace(/:[a-zA-Z0-9_+\-]+:/g, '');
    // Remove unicode pictographs/emojis
    try {
      out = out.replace(/\p{Extended_Pictographic}/gu, '');
    } catch {
      // ignore if engine doesn't support unicode properties
    }
    // Strip leading bullets/numbers from each line (e.g., -, *, •, 1., 1), a), etc.)
    out = out
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*([\-\*•\u2013\u2014]|\d+[\.)]|[A-Za-z][\)])\s+/, '').trim())
      .join(' ');
    // Collapse whitespace
    out = out.replace(/\s+/g, ' ').trim();
    return out;
  };

  // Build pages with simple flow; @react-pdf handles pagination automatically
  return (
    <Document>
      <Page size="LETTER" style={{ ...styles.page, fontSize: scaled(10) }}>
        <View style={styles.header}>
          <Text style={{ ...styles.title, fontSize: scaled(18) }}>{setlist.name}</Text>
        </View>

        {setlist.items.map((item, idx) => {
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
            return (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={{ ...styles.idx, fontSize: scaled(9) }}>{idx + 1}.</Text>
                  <Text style={{ ...styles.break, fontSize: scaled(11) }}>
                    {item.title || 'Break'}
                  </Text>
                </View>
                <Text style={{ ...styles.duration, fontSize: scaled(10) }}>
                  {formatDuration(itemDurationSeconds(setlist, item, defaultSongGapSec))}
                </Text>
              </View>
            );
          }

          const song = item.songId ? songsById[item.songId] : undefined;
          return (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                {/* Small tabulation before songs (no numbering) */}
                <View style={{ width: 12 }} />
                <View>
                  <Text style={{ ...styles.songTitle, fontSize: scaled(34) }}>
                    {displayTitle(setlist, item, song)}
                  </Text>
                  {song && (
                    <Text style={{ ...styles.songMeta, fontSize: scaled(9) }}>
                      {setlist.showArtist !== false ? song.artist : ''}
                    </Text>
                  )}
                </View>
              </View>
              {/* No right-side durations for songs in PDF */}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
