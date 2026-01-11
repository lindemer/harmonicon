const STORAGE_KEY = 'harmonicon-theme';

type ThemePreference = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

function getSystemTheme(): EffectiveTheme {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') {
		return stored;
	}
	return null;
}

function createThemeState() {
	let preference = $state<ThemePreference>('system');
	let systemTheme = $state<EffectiveTheme>('dark');

	const effectiveTheme = $derived<EffectiveTheme>(
		preference === 'system' ? systemTheme : preference
	);

	function applyTheme(theme: EffectiveTheme) {
		if (typeof document === 'undefined') return;
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function initialize() {
		// Get stored preference or default to system
		const stored = getStoredPreference();
		preference = stored ?? 'system';

		// Get current system theme
		systemTheme = getSystemTheme();

		// Apply initial theme
		applyTheme(preference === 'system' ? systemTheme : preference);

		// Listen for system theme changes
		if (typeof window !== 'undefined') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', (e) => {
				systemTheme = e.matches ? 'dark' : 'light';
				if (preference === 'system') {
					applyTheme(systemTheme);
				}
			});
		}
	}

	function toggle() {
		// Simple toggle: dark -> light -> dark
		const newTheme: ThemePreference = effectiveTheme === 'dark' ? 'light' : 'dark';
		preference = newTheme;
		localStorage.setItem(STORAGE_KEY, newTheme);
		applyTheme(newTheme);
	}

	return {
		get preference() {
			return preference;
		},
		get effectiveTheme() {
			return effectiveTheme;
		},
		get isDark() {
			return effectiveTheme === 'dark';
		},
		initialize,
		toggle
	};
}

export const themeState = createThemeState();
