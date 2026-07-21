import { useMemo } from 'react';
import type { Hero } from '@/models/hero';
import type { Sourcebook } from '@/models/sourcebook';
import type { Ancestry } from '@/models/ancestry';
import type { Career } from '@/models/career';
import type { HeroClass } from '@/models/class';
import type { Feature, FeatureChoice } from '@/models/feature';
import { FeatureType } from '@/enums/feature-type';
import { HeroLogic } from '@/logic/hero-logic';
import { Section } from './Section';
import { EditableText } from './EditableText';
import { Picker, type PickerOption } from './Picker';
import { ToggleChoice } from './ToggleChoice';
import './HeaderPanel.css';

interface HeaderPanelProps {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onHeroChange: (hero: Hero) => void;
}

function emptyAncestry(name: string): Ancestry {
	return { id: crypto.randomUUID(), name, description: '', features: [], ancestryPoints: 0 };
}

function emptyCareer(name: string): Career {
	return { id: crypto.randomUUID(), name, description: '', features: [], incitingIncidents: { options: [], selected: null } };
}

function emptyHeroClass(name: string): HeroClass {
	return {
		id: crypto.randomUUID(),
		name,
		description: '',
		type: 'standard',
		subclassName: '',
		subclassCount: 0,
		primaryCharacteristicsOptions: [],
		primaryCharacteristics: [],
		featuresByLevel: [],
		abilities: [],
		subclasses: [],
		level: 1,
		characteristics: []
	};
}

export function HeaderPanel({ hero, sourcebooks, onHeroChange }: HeaderPanelProps) {
	const ancestries = useMemo<PickerOption[]>(
		() => sourcebooks.flatMap(sb => sb.ancestries).map(a => ({ id: a.id, name: a.name })),
		[ sourcebooks ]
	);
	const classes = useMemo<PickerOption[]>(
		() => sourcebooks.flatMap(sb => sb.classes).map(c => ({ id: c.id, name: c.name })),
		[ sourcebooks ]
	);
	const careers = useMemo<PickerOption[]>(
		() => sourcebooks.flatMap(sb => sb.careers).map(c => ({ id: c.id, name: c.name })),
		[ sourcebooks ]
	);

	const fullAncestries = useMemo(() => sourcebooks.flatMap(sb => sb.ancestries), [ sourcebooks ]);
	const fullClasses = useMemo(() => sourcebooks.flatMap(sb => sb.classes), [ sourcebooks ]);
	const fullCareers = useMemo(() => sourcebooks.flatMap(sb => sb.careers), [ sourcebooks ]);

	function updateName(name: string) {
		onHeroChange({ ...hero, name });
	}

	// Picking a new Ancestry/Class/Career/Subclass only changes that field's
	// own name/description data (or, if the field was previously empty,
	// adopts the picked catalog entry wholesale - there's nothing to
	// preserve in that case). It deliberately does NOT re-derive or rebuild
	// the downstream feature tree, abilities, or characteristics - see the
	// note rendered at the bottom of this panel.

	function selectAncestry(picked: PickerOption) {
		const full = fullAncestries.find(a => a.id === picked.id);
		const next = hero.ancestry
			? { ...hero.ancestry, id: picked.id, name: picked.name, description: full?.description ?? '' }
			: (full ? { ...full } : emptyAncestry(picked.name));
		onHeroChange({ ...hero, ancestry: next });
	}

	function freeTextAncestry(name: string) {
		const next = hero.ancestry ? { ...hero.ancestry, name } : emptyAncestry(name);
		onHeroChange({ ...hero, ancestry: next });
	}

	function selectClass(picked: PickerOption) {
		const full = fullClasses.find(c => c.id === picked.id);
		const next = hero.class
			? { ...hero.class, id: picked.id, name: picked.name, description: full?.description ?? '' }
			: (full ? { ...full } : emptyHeroClass(picked.name));
		onHeroChange({ ...hero, class: next });
	}

	function freeTextClass(name: string) {
		const next = hero.class ? { ...hero.class, name } : emptyHeroClass(name);
		onHeroChange({ ...hero, class: next });
	}

	function selectCareer(picked: PickerOption) {
		const full = fullCareers.find(c => c.id === picked.id);
		const next = hero.career
			? { ...hero.career, id: picked.id, name: picked.name, description: full?.description ?? '' }
			: (full ? { ...full } : emptyCareer(picked.name));
		onHeroChange({ ...hero, career: next });
	}

	function freeTextCareer(name: string) {
		const next = hero.career ? { ...hero.career, name } : emptyCareer(name);
		onHeroChange({ ...hero, career: next });
	}

	function selectSubclass(picked: PickerOption) {
		if (!hero.class) {
			return;
		}
		const subclasses = hero.class.subclasses.map(sc => ({ ...sc, selected: sc.id === picked.id }));
		onHeroChange({ ...hero, class: { ...hero.class, subclasses } });
	}

	const ancestryChoiceFeatures = (hero.ancestry?.features ?? [])
		.filter((f): f is FeatureChoice => f.type === FeatureType.Choice);
	const ancestryPointBudget = HeroLogic.getAncestryPoints(hero);

	function updateChoiceSelection(featureId: string, selected: Feature[]) {
		if (!hero.ancestry) {
			return;
		}
		const features = hero.ancestry.features.map(f =>
			(f.id === featureId && f.type === FeatureType.Choice)
				? { ...f, data: { ...f.data, selected } }
				: f
		);
		onHeroChange({ ...hero, ancestry: { ...hero.ancestry, features } });
	}

	const subclassOptions: PickerOption[] = (hero.class?.subclasses ?? []).map(sc => ({ id: sc.id, name: sc.name }));
	const currentSubclassName = hero.class?.subclasses.find(sc => sc.selected)?.name ?? '';

	return (
		<Section title="Header">
			<EditableText label="Name" value={hero.name} onChange={updateName} />

			<Picker
				label="Ancestry"
				options={ancestries}
				currentName={hero.ancestry?.name ?? ''}
				onSelect={selectAncestry}
				onFreeText={freeTextAncestry}
			/>

			<Picker
				label="Class"
				options={classes}
				currentName={hero.class?.name ?? ''}
				onSelect={selectClass}
				onFreeText={freeTextClass}
			/>

			<Picker
				label="Career"
				options={careers}
				currentName={hero.career?.name ?? ''}
				onSelect={selectCareer}
				onFreeText={freeTextCareer}
			/>

			{hero.class && subclassOptions.length > 0 && (
				<Picker
					label="Subclass"
					options={subclassOptions}
					currentName={currentSubclassName}
					onSelect={selectSubclass}
					allowFreeText={false}
				/>
			)}

			{ancestryChoiceFeatures.map(f => (
				<ToggleChoice
					key={f.id}
					title={f.name}
					description={f.description}
					options={f.data.options}
					selected={f.data.selected}
					budget={f.data.count === 'ancestry' ? ancestryPointBudget : f.data.count}
					onChange={selected => updateChoiceSelection(f.id, selected)}
				/>
			))}

			<p className="header-panel-note">
				Changing Ancestry, Class, Career, or Subclass here only updates that
				field's own name and description (not shown, but stored on the hero) -
				it does not rebuild features, abilities, or characteristics to match.
				Those stay as they were until a future section addresses them, or until
				you re-import from Forge Steel.
			</p>
		</Section>
	);
}
