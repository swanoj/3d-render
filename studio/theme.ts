import { buildLegacyTheme } from 'sanity'

/** The back office in the Club Casa colours: charcoal and cream, with orange for the things you press. */
const palette = {
  orange: '#E95E27',
  charcoal: '#212121',
  stone: '#CCC6BA',
  cream: '#EDE1D3',
}

export const theme = buildLegacyTheme({
  '--black': palette.charcoal,
  '--white': palette.cream,
  '--gray': '#6b665e',
  '--gray-base': '#6b665e',
  '--component-bg': palette.cream,
  '--component-text-color': palette.charcoal,
  '--brand-primary': palette.orange,
  '--default-button-primary-color': palette.orange,
  '--focus-color': palette.orange,
  '--main-navigation-color': palette.charcoal,
  '--main-navigation-color--inverted': palette.cream,
  '--font-family-base': '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif',
})
