import React from 'react';
import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { MonthBuild } from '@/utils/calendarYearBuild';
import { WEEKDAY_LABELS, formatGregorian } from '@/utils/calendarYearBuild';
import { getOmerCount } from '@/utils/sacredCalendar';

const styles = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', backgroundColor: '#FBF8F1' },
  hero: { width: '100%', height: 360, objectFit: 'cover' },
  heroFallback: { width: '100%', height: 360, backgroundColor: '#E8E2D2' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 360,
    backgroundColor: '#000', opacity: 0.18,
  },
  heroTitleWrap: {
    position: 'absolute', left: 32, right: 32, top: 240,
  },
  monthLabel: {
    fontSize: 44, fontWeight: 'bold', color: '#FFFFFF',
    letterSpacing: 2,
  },
  yearLabel: {
    fontSize: 14, color: '#FFFFFF', letterSpacing: 4,
    marginTop: 4, opacity: 0.9,
  },
  gregorianRange: {
    fontSize: 10, color: '#FFFFFF', letterSpacing: 1,
    marginTop: 2, opacity: 0.85,
  },

  body: { padding: 28, paddingTop: 18 },

  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#6B5B3E',
    paddingBottom: 6, marginBottom: 4,
  },
  weekHeaderCell: {
    flex: 1, fontSize: 9, fontWeight: 'bold',
    textAlign: 'center', color: '#6B5B3E', letterSpacing: 1,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    minHeight: 78,
    borderBottomWidth: 0.5, borderBottomColor: '#D8CFB8',
    borderRightWidth: 0.5, borderRightColor: '#D8CFB8',
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  cellTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cellNumber: { fontSize: 14, fontWeight: 'bold', color: '#2A2418' },
  cellGregorian: { fontSize: 7, color: '#9A8B68', marginTop: 2 },
  cellFeast: {
    fontSize: 6.5, color: '#8C3A00', marginTop: 3,
    fontWeight: 'bold',
  },
  sabbathCell: { backgroundColor: '#FFF4E0' },
  highSabbathCell: { backgroundColor: '#F6D9B0' },
  intercalary: { fontSize: 6, color: '#8a7a55', fontStyle: 'italic' },

  footer: {
    marginTop: 14, paddingTop: 8,
    borderTopWidth: 0.5, borderTopColor: '#C9BFA3',
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: '#6B5B3E',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendSwatch: { width: 8, height: 8, marginRight: 4 },
});

interface Props {
  month: MonthBuild;
  year: number;
  imageUrl: string;
}

function gregorianDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export const MonthPage: React.FC<Props> = ({ month, year, imageUrl }) => {
  const firstWeekDay = month.days[0]?.weekDay ?? 1;
  const leadingBlanks = Array.from({ length: firstWeekDay - 1 });

  return (
    <Page size="A4" style={styles.page}>
      <View>
        {imageUrl
          ? <Image src={imageUrl} style={styles.hero} />
          : <View style={styles.heroFallback} />}
        <View style={styles.heroOverlay} />
        <View style={styles.heroTitleWrap}>
          <Text style={styles.monthLabel}>{month.label.toUpperCase()}</Text>
          <Text style={styles.yearLabel}>SCRIPTURAL YEAR {year}</Text>
          <Text style={styles.gregorianRange}>
            {formatGregorian(month.gregorianStart)} — {formatGregorian(month.gregorianEnd)}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekHeaderCell}>{label.toUpperCase()}</Text>
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
                <View style={styles.cellTopRow}>
                  <Text style={styles.cellNumber}>
                    {d.dayOfMonth}{d.info.isIntercalary ? '*' : ''}
                  </Text>
                  <Text style={styles.cellGregorian}>{gregorianDay(d.gregorian)}</Text>
                </View>
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

        <View style={styles.footer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#FFF4E0' }]} />
            <Text>Sabbath</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#F6D9B0' }]} />
            <Text>High Sabbath</Text>
          </View>
          <Text>* Intercalary day</Text>
          <Text>Scriptural dates · Gregorian shown small</Text>
        </View>
      </View>
    </Page>
  );
};
