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
  tip: '78BD53',
  important: '9F3D61',
  warning: 'E26237',
  caution: 'D55A1F',
};

const COLOR_SCHEMES: Record<ColorScheme, Record<GfmAlertType, string>> = {
  github: GITHUB_ALERT_COLORS,
  guttmacher: GUTTMACHER_ALERT_COLORS,
};

/** Return the alert color map for a given color scheme. */
export function alertColorsByScheme(scheme: ColorScheme): Record<GfmAlertType, string> {
  return COLOR_SCHEMES[scheme] ?? GITHUB_ALERT_COLORS;
}

/** Module-level default color scheme, updated from VS Code settings */
let _defaultColorScheme: ColorScheme = 'github';

export function setDefaultColorScheme(scheme: ColorScheme): void {
  _defaultColorScheme = (scheme === 'github' || scheme === 'guttmacher') ? scheme : 'github';
}

export function getDefaultColorScheme(): ColorScheme {
  return _defaultColorScheme;
}
