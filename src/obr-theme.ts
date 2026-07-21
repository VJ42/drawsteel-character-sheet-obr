import OBR from '@owlbear-rodeo/sdk';

function applyTheme(mode: 'DARK' | 'LIGHT'): void {
	document.documentElement.setAttribute('data-theme', mode === 'DARK' ? 'dark' : 'light');
}

// The app must run standalone in a normal browser tab as well as embedded in
// OBR (docs/project-overview.md). OBR.isAvailable is false outside an OBR
// iframe, so standalone mode falls back to the OS/browser color-scheme
// preference instead of the (nonexistent) OBR theme.
export function initThemeSync(): void {
	if (!OBR.isAvailable) {
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		applyTheme(media.matches ? 'DARK' : 'LIGHT');
		media.addEventListener('change', e => applyTheme(e.matches ? 'DARK' : 'LIGHT'));
		return;
	}

	OBR.onReady(() => {
		OBR.theme.getTheme().then(theme => applyTheme(theme.mode));
		OBR.theme.onChange(theme => applyTheme(theme.mode));
	});
}
