import React from 'react';
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { YearBuild } from '@/utils/calendarYearBuild';
import { formatGregorian } from '@/utils/calendarYearBuild';

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 4 },
  column: { flex: 1, borderWidth: 0.5, borderColor: '#CCC' },
  columnHeader: {
    backgroundColor: '#222', color: '#FFF',
    fontSize: 9, fontWeight: 'bold',
    padding: 4, textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: 3, paddingVertical: 1,
    fontSize: 6.5,
    borderBottomWidth: 0.25, borderBottomColor: '#EEE',
  },
  dayNum: { width: 14, color: '#333' },
  dayFeast: { flex: 1, color: '#7a3b00' },
  sabbath: { backgroundColor: '#FFF4E0' },
  highSabbath: { backgroundColor: '#FDE2C4' },

  feastListTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 14, marginBottom: 6 },
  feastRow: { flexDirection: 'row', fontSize: 9, paddingVertical: 2 },
  feastWhen: { width: 110, color: '#333' },
  feastName: { flex: 1 },
});

interface Props { year: YearBuild }

export const YearPlannerPage: React.FC<Props> = ({ year }) => (
  <>
    <Page size="A3" orientation="landscape" style={styles.page}>
      <Text style={styles.title}>Year {year.year} — Scriptural Planner</Text>

      <View style={styles.grid}>
        {year.months.map((m) => (
          <View key={m.month} style={styles.column}>
            <Text style={styles.columnHeader}>{m.label}</Text>
            {m.days.map((d) => {
              const bg = d.info.isHighSabbath
                ? styles.highSabbath
                : d.info.isSabbath ? styles.sabbath : undefined;
              const rowStyle = bg ? [styles.dayRow, bg] : styles.dayRow;
              return (
                <View key={d.dayOfMonth} style={rowStyle}>
                  <Text style={styles.dayNum}>{d.dayOfMonth}{d.info.isIntercalary ? '*' : ''}</Text>
                  <Text style={styles.dayFeast}>{d.info.feastName ?? ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.feastListTitle}>Feast Days — Year {year.year}</Text>
      {year.feastDays.map((f, i) => (
        <View key={i} style={styles.feastRow}>
          <Text style={styles.feastWhen}>M{f.month} D{f.day}  ·  {formatGregorian(f.gregorian)}</Text>
          <Text style={styles.feastName}>{f.name}{f.isHighSabbath ? '  (High Sabbath)' : ''}</Text>
        </View>
      ))}
    </Page>
  </>
);
