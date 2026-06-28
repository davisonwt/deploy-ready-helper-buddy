import React from 'react';
import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { MonthBuild } from '@/utils/calendarYearBuild';
import { WEEKDAY_LABELS, formatGregorian } from '@/utils/calendarYearBuild';

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  hero: { width: '100%', height: 320, objectFit: 'cover', borderRadius: 6 },
  header: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  monthLabel: { fontSize: 28, fontWeight: 'bold' },
  yearLabel: { fontSize: 14, color: '#555' },
  weekHeader: {
    marginTop: 12,
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#333',
    paddingBottom: 4,
  },
  weekHeaderCell: { flex: 1, fontSize: 9, textAlign: 'center', color: '#555' },
  grid: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    minHeight: 56,
    borderBottomWidth: 0.5, borderBottomColor: '#DDD',
    borderRightWidth: 0.5, borderRightColor: '#DDD',
    padding: 3,
  },
  cellNumber: { fontSize: 11, fontWeight: 'bold' },
  cellFeast: { fontSize: 7, color: '#7a3b00', marginTop: 1 },
  sabbathCell: { backgroundColor: '#FFF4E0' },
  highSabbathCell: { backgroundColor: '#FDE2C4' },
  intercalary: { fontSize: 7, color: '#777' },
  footer: { marginTop: 'auto', paddingTop: 8, fontSize: 9, color: '#666', textAlign: 'center' },
});

interface Props {
  month: MonthBuild;
  year: number;
  imageUrl: string;
}

export const MonthPage: React.FC<Props> = ({ month, year, imageUrl }) => {
  // Build a 7-column grid that respects each day's actual weekDay (1..7).
  const firstWeekDay = month.days[0]?.weekDay ?? 1;
  const leadingBlanks = Array.from({ length: firstWeekDay - 1 });

  return (
    <Page size="A4" style={styles.page}>
      {imageUrl ? <Image src={imageUrl} style={styles.hero} /> : <View style={[styles.hero, { backgroundColor: '#EEE' }]} />}

      <View style={styles.header}>
        <Text style={styles.monthLabel}>{month.label}</Text>
        <Text style={styles.yearLabel}>Year {year}</Text>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekHeaderCell}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {leadingBlanks.map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {month.days.map((d) => {
          const bg = d.info.isHighSabbath
            ? styles.highSabbathCell
            : d.info.isSabbath ? styles.sabbathCell : undefined;
          const cellStyles = bg ? [styles.cell, bg] : styles.cell;

          return (
            <View key={d.dayOfMonth} style={cellStyles}>
              <Text style={styles.cellNumber}>{d.dayOfMonth}{d.info.isIntercalary ? '*' : ''}</Text>
              {d.info.feastName ? (
                <Text style={styles.cellFeast}>{d.info.feastName}</Text>
              ) : null}
              {d.info.isIntercalary ? (
                <Text style={styles.intercalary}>Intercalary</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.footer}>
        Gregorian: {formatGregorian(month.gregorianStart)} – {formatGregorian(month.gregorianEnd)}
        {'   ·   '}Shaded = Sabbath  ·  * = Intercalary day
      </Text>
    </Page>
  );
};
