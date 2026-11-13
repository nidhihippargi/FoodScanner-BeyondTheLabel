export const colors = {
  primary: '#2E7D32', bg: '#F6F8F5', card: '#FFFFFF', text: '#1B1F1D', muted: '#6B7570', border: '#E1E6E2',
  red: '#D32F2F', amber: '#F9A825', green: '#2E7D32', unknown: '#9E9E9E',
  redBg: '#FDECEA', amberBg: '#FFF6DD', greenBg: '#E8F5E9', unknownBg: '#F0F0F0',
};
export const levelColor = (l) => colors[l] || colors.unknown;
export const levelBg = (l) => colors[`${l}Bg`] || colors.unknownBg;
export const gradeColor = (g) => ({ A: '#2E7D32', B: '#7CB342', C: '#F9A825', D: '#EF6C00', E: '#D32F2F' }[g] || colors.unknown);
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 };
