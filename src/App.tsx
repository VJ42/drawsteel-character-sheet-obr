import { useState, type ChangeEvent } from 'react';
import type { Hero } from '@/models/hero';
import type { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { HeroUpdateLogic } from '@/logic/update/hero-update-logic';
import './styles/tokens.css';
import './App.css';

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

export default function App() {
	const [ hero, setHero ] = useState<Hero | null>(null);
	const [ sourcebooks, setSourcebooks ] = useState<Sourcebook[]>([]);
	const [ status, setStatus ] = useState('');

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		setStatus(`Loading ${file.name}...`);

		try {
			const text = await readFileAsText(file);
			const parsed = JSON.parse(text) as Hero;

			const activeSourcebooks = SourcebookLogic.getSourcebooks()
				.filter(sb => parsed.sourcebookIDs.includes(sb.id));
			HeroUpdateLogic.updateHero(parsed, activeSourcebooks);

			setHero(parsed);
			setSourcebooks(activeSourcebooks);
			setStatus(`Loaded ${file.name}${parsed.name ? ` (${parsed.name})` : ''}.`);
		} catch (err) {
			setStatus(`Failed to load hero: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	return (
		<main className="app">
			<h1>Draw Steel Character Sheet</h1>
			<p>Load a .ds-hero file to see the sheet.</p>
			<input type="file" accept=".ds-hero" id="hero-file-input" onChange={handleFileChange} />
			<p id="status">{status}</p>
			{hero && <p>Loaded {sourcebooks.length} sourcebooks. Panels land in the next commit.</p>}
		</main>
	);
}
