// Design tokens. Traffic-light colours are used consistently across the app.
export const colors = {
  bg: '#F5F7F4',
  card: '#FFFFFF',
  text: '#1B2420',
  muted: '#6B7872',
  border: '#E3E8E4',
  primary: '#1F8A4C',
  green: '#2E9E5B',
  greenBg: '#E4F4EA',
  amber: '#E39A00',
  amberBg: '#FFF3D6',
  red: '#D64545',
  redBg: '#FCE7E7',
};

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

/** Maps 'green' | 'amber' | 'red' to { fg, bg } colours. */
export function tone(level) {
  if (level === 'red') return { fg: colors.red, bg: colors.redBg };
  if (level === 'amber') return { fg: colors.amber, bg: colors.amberBg };
  if (level === 'green') return { fg: colors.green, bg: colors.greenBg };
  return { fg: colors.muted, bg: '#EEF1EF' };
}

export const RATING_LABEL = {
  green: 'Looks transparent',
  amber: 'Check the details',
  red: 'Misleading / high risk',
};
