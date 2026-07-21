// Vitals-section spike (see docs/handoff.md "Immediate next action").
// Plain vanilla TypeScript/DOM - no React/JSX in this code path, on purpose.
// Loads a .ds-hero file, runs it through the same import pipeline as
// scripts/verify-pipeline.ts, and renders six derived vitals to the DOM.
import './index.css';
import type { Hero } from '@/models/hero';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { HeroUpdateLogic } from '@/logic/update/hero-update-logic';
import { HeroLogic } from '@/logic/hero-logic';
import { renderFeatures } from './features-panel';

interface VitalsRow {
	label: string;
	valueEl: HTMLElement;
}

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

function buildVitalsRow(container: HTMLElement, label: string): VitalsRow {
	const row = document.createElement('div');
	row.className = 'vitals-row';

	const labelEl = document.createElement('span');
	labelEl.className = 'vitals-label';
	labelEl.textContent = label;

	const valueEl = document.createElement('span');
	valueEl.className = 'vitals-value';
	valueEl.textContent = '—';

	row.append(labelEl, valueEl);
	container.append(row);

	return { label, valueEl };
}

function mountApp(root: HTMLElement): void {
	root.innerHTML = '';

	const heading = document.createElement('h1');
	heading.textContent = 'Draw Steel Character Sheet';
	root.append(heading);

	const intro = document.createElement('p');
	intro.textContent = 'Load a .ds-hero file to see its vitals.';
	root.append(intro);

	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = '.ds-hero';
	fileInput.id = 'hero-file-input';
	root.append(fileInput);

	const statusEl = document.createElement('p');
	statusEl.id = 'status';
	root.append(statusEl);

	const vitalsPanel = document.createElement('div');
	vitalsPanel.id = 'vitals-panel';
	root.append(vitalsPanel);

	const rows = {
		stamina: buildVitalsRow(vitalsPanel, 'Stamina'),
		windedThreshold: buildVitalsRow(vitalsPanel, 'Winded Threshold'),
		recoveries: buildVitalsRow(vitalsPanel, 'Recoveries'),
		recoveryValue: buildVitalsRow(vitalsPanel, 'Recovery Value'),
		speed: buildVitalsRow(vitalsPanel, 'Speed'),
		stability: buildVitalsRow(vitalsPanel, 'Stability')
	};

	const featuresHeading = document.createElement('h2');
	featuresHeading.textContent = 'Features';
	root.append(featuresHeading);

	const featuresList = document.createElement('ul');
	featuresList.id = 'features-list';
	root.append(featuresList);

	fileInput.addEventListener('change', async event => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			return;
		}

		statusEl.textContent = `Loading ${file.name}...`;

		try {
			const text = await readFileAsText(file);
			const hero = JSON.parse(text) as Hero;

			const sourcebooks = SourcebookLogic.getSourcebooks()
				.filter(sb => hero.sourcebookIDs.includes(sb.id));
			HeroUpdateLogic.updateHero(hero, sourcebooks);

			rows.stamina.valueEl.textContent = `${HeroLogic.getStamina(hero)}`;
			rows.windedThreshold.valueEl.textContent = `${HeroLogic.getWindedThreshold(hero)}`;
			rows.recoveries.valueEl.textContent = `${HeroLogic.getRecoveries(hero)}`;
			rows.recoveryValue.valueEl.textContent = `${HeroLogic.getRecoveryValue(hero)}`;
			rows.speed.valueEl.textContent = `${HeroLogic.getSpeed(hero).value}`;
			rows.stability.valueEl.textContent = `${HeroLogic.getStability(hero)}`;

			const features = HeroLogic.getFeatures(hero);
			renderFeatures(featuresList, features, hero);

			statusEl.textContent = `Loaded ${file.name}${hero.name ? ` (${hero.name})` : ''} - ${features.length} active features.`;
		} catch (err) {
			statusEl.textContent = `Failed to load hero: ${err instanceof Error ? err.message : String(err)}`;
		}
	});
}

mountApp(document.getElementById('root')!);
