import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initThemeSync } from './obr-theme';
import App from './App';

initThemeSync();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
