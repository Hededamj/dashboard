/**
 * Academy Theme Configuration
 * Design system for academy.mettehummel.dk
 * Use this for MobilePay checkout, reports, and academy-related components
 */

export const academyTheme = {
  colors: {
    primary: '#86A0A6',      // Muted teal/blue-gray
    secondary: '#54595F',    // Dark gray
    text: '#7A7A7A',         // Medium gray
    accent: '#BDA679',       // Gold/tan
    background: '#FFF6F6',   // Very light pink/cream
  },

  fonts: {
    primary: {
      family: 'Advent Pro',
      weight: 600,
    },
    secondary: {
      family: 'Montserrat',
      weight: 400,
    },
    text: {
      family: 'Roboto',
      weight: 400,
    },
    accent: {
      family: 'Roboto',
      weight: 500,
    },
  },
} as const;

/**
 * Tailwind-compatible class strings for academy branding
 */
export const academyClasses = {
  heading: 'font-["Advent_Pro"] font-semibold text-[#86A0A6]',
  subheading: 'font-["Montserrat"] font-normal text-[#54595F]',
  body: 'font-["Roboto"] font-normal text-[#7A7A7A]',
  buttonPrimary: 'bg-[#86A0A6] hover:bg-[#6f8990] text-white font-["Roboto"] font-medium px-6 py-3 rounded transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
  buttonAccent: 'bg-[#BDA679] hover:bg-[#a88f62] text-white font-["Roboto"] font-medium px-6 py-3 rounded transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
  card: 'bg-white border border-gray-200 rounded-lg p-6 shadow-sm',
  background: 'bg-[#FFF6F6]',
} as const;

/**
 * Get inline styles for academy branding (useful for non-Tailwind contexts)
 */
export const getAcademyStyles = () => ({
  heading: {
    fontFamily: academyTheme.fonts.primary.family,
    fontWeight: academyTheme.fonts.primary.weight,
    color: academyTheme.colors.primary,
  },
  subheading: {
    fontFamily: academyTheme.fonts.secondary.family,
    fontWeight: academyTheme.fonts.secondary.weight,
    color: academyTheme.colors.secondary,
  },
  body: {
    fontFamily: academyTheme.fonts.text.family,
    fontWeight: academyTheme.fonts.text.weight,
    color: academyTheme.colors.text,
  },
  buttonPrimary: {
    backgroundColor: academyTheme.colors.primary,
    color: 'white',
    fontFamily: academyTheme.fonts.accent.family,
    fontWeight: academyTheme.fonts.accent.weight,
    padding: '12px 24px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
  },
  buttonAccent: {
    backgroundColor: academyTheme.colors.accent,
    color: 'white',
    fontFamily: academyTheme.fonts.accent.family,
    fontWeight: academyTheme.fonts.accent.weight,
    padding: '12px 24px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  background: {
    backgroundColor: academyTheme.colors.background,
  },
});
