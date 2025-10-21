import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

import type { Project, Setlist, SetlistItem, Song } from '../types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 28,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: {
    fontSize: 10,
    color: '#444',
    marginTop: 4,
  },
  sectionHeader: { marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 'bold' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  itemLeft: { flexDirection: 'row', maxWidth: '80%' },
  idx: { fontSize: 10, color: '#666', width: 16, textAlign: 'right', marginRight: 6 },
  songTitle: { fontSize: 11 },
  songMeta: { fontSize: 9, color: '#666' },
  duration: { fontSize: 10, color: '#333' },
  note: { fontSize: 10, fontStyle: 'italic', color: '#333' },
  break: { fontSize: 11, color: '#111' },
});

export type SetlistPDFProps = {
  project: Project;
  setlist: Setlist;
  songsById: Record<string, Song>;
  defaultSongGapSec: number;
  fontSize?: number; // base font size multiplier (1.0 = default)
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
}: SetlistPDFProps) {
  const scale = Math.max(0.6, Math.min(1.6, fontSize));
  const scaled = (n: number) => Math.round(n * scale);

  // Build pages with simple flow; @react-pdf handles pagination automatically
  return (
    <Document>
      <Page size="LETTER" style={{ ...styles.page, fontSize: scaled(10) }}>
        <View style={styles.header}>
          <Text style={{ ...styles.title, fontSize: scaled(18) }}>
            {project.name} — {setlist.name}
          </Text>
          <Text style={{ ...styles.meta, fontSize: scaled(9) }}>
            {setlist.date || ''}
            {setlist.time ? ` • ${setlist.time}` : ''}
            {setlist.venue ? ` • ${setlist.venue}` : ''}
          </Text>
        </View>

        {setlist.items.map((item, idx) => {
          if (item.type === 'section') {
            return (
              <Text key={idx} style={{ ...styles.sectionHeader, fontSize: scaled(12) }}>
                {item.title || 'Section'}
              </Text>
            );
          }

          if (item.type === 'note') {
            return (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={{ ...styles.idx, fontSize: scaled(9) }}>{idx + 1}.</Text>
                  <Text style={{ ...styles.note, fontSize: scaled(10) }}>{item.note}</Text>
                </View>
                <Text style={{ ...styles.duration, fontSize: scaled(10) }}>
                  {formatDuration(itemDurationSeconds(setlist, item, defaultSongGapSec))}
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
                <Text style={{ ...styles.idx, fontSize: scaled(9) }}>{idx + 1}.</Text>
                <View>
                  <Text style={{ ...styles.songTitle, fontSize: scaled(11) }}>
                    {displayTitle(setlist, item, song)}
                  </Text>
                  {song && (
                    <Text style={{ ...styles.songMeta, fontSize: scaled(9) }}>
                      {setlist.showArtist !== false ? song.artist : ''}
                      {song.tempo ? (song.artist ? ' • ' : '') + `${song.tempo} bpm` : ''}
                    </Text>
                  )}
                </View>
              </View>
              {setlist.hideItemDurations ? (
                <Text />
              ) : (
                <Text style={{ ...styles.duration, fontSize: scaled(10) }}>
                  {formatDuration(itemDurationSeconds(setlist, item, defaultSongGapSec))}
                </Text>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
