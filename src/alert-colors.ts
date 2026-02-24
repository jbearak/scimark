import type { GfmAlertType } from './gfm';
import type { ColorScheme } from './frontmatter';

/** GitHub default alert border colors (6-digit hex, no #) */
export const GITHUB_ALERT_COLORS: Record<GfmAlertType, string> = {
  note: '1F6FEB',
  tip: '238636',
  important: '8957E5',
  warning: '9A6700',
  caution: 'CF222E',
};

/** Guttmacher brand alert border colors (6-digit hex, no #) */
export const GUTTMACHER_ALERT_COLORS: Record<GfmAlertType, string> = {
  note: '0F6779',
  tip: '5C9E38',
  important: '9F3D61',
  warning: 'B39215',
  caution: 'D55A1F',
};

const COLOR_SCHEMES: Record<ColorScheme, Record<GfmAlertType, string>> = {
  github: GITHUB_ALERT_COLORS,
  guttmacher: GUTTMACHER_ALERT_COLORS,
};

/** Return the alert color map for a given color scheme.
 *  Falls back to the default scheme's colors for unrecognized values. */
export function alertColorsByScheme(scheme: ColorScheme): Record<GfmAlertType, string> {
  return COLOR_SCHEMES[scheme] ?? COLOR_SCHEMES[_defaultColorScheme];
}

/** Module-level default color scheme, updated from VS Code settings */
let _defaultColorScheme: ColorScheme = 'guttmacher';

export function setDefaultColorScheme(scheme: ColorScheme): void {
  _defaultColorScheme = (scheme === 'github' || scheme === 'guttmacher') ? scheme : 'guttmacher';
}

export function getDefaultColorScheme(): ColorScheme {
  return _defaultColorScheme;
}
