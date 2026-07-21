// Features-list spike (see docs/handoff.md's build plan). Renders
// HeroLogic.getFeatures(hero) to plain DOM, with type-specific handling for
// the representative cases called out in ds-hero-format.md's "Feature
// types" section. Any type not explicitly handled falls back to
// name + description, per ds-hero-format.md / project-overview.md.
import type { Hero } from '@/models/hero';
import type { Feature } from '@/models/feature';
import type { Ability } from '@/models/ability';
import type { PowerRoll } from '@/models/power-roll';
import { FeatureType } from '@/enums/feature-type';
import { AbilityLogic } from '@/logic/ability-logic';
import { FormatLogic } from '@/logic/format-logic';

type ActiveFeature = { feature: Feature; source: string; level: number | undefined };

function appendMeta(container: HTMLElement, text: string): void {
	const meta = document.createElement('div');
	meta.className = 'feature-meta';
	meta.textContent = text;
	container.append(meta);
}

function appendSubFeatures(container: HTMLElement, features: Feature[], hero: Hero): void {
	if (features.length === 0) {
		return;
	}

	const sublist = document.createElement('ul');
	sublist.className = 'feature-sublist';
	features.forEach(sub => {
		const li = document.createElement('li');
		renderFeature(li, sub, hero);
		sublist.append(li);
	});
	container.append(sublist);
}

function renderPowerRoll(container: HTMLElement, roll: PowerRoll): void {
	const wrap = document.createElement('div');
	wrap.className = 'power-roll';

	const heading = document.createElement('div');
	heading.className = 'power-roll-heading';
	const characteristics = roll.characteristic.join(' / ');
	const bonus = roll.bonus ? ` + ${roll.bonus}` : '';
	heading.textContent = `Power Roll: ${characteristics}${bonus}`;
	wrap.append(heading);

	const tiers = document.createElement('ul');
	tiers.className = 'power-roll-tiers';
	([
		[ '≤ 11', roll.tier1 ],
		[ '12–16', roll.tier2 ],
		[ '17+', roll.tier3 ]
	] as const).forEach(([ label, text ]) => {
		const li = document.createElement('li');
		li.textContent = `${label}: ${text}`;
		tiers.append(li);
	});
	wrap.append(tiers);

	container.append(wrap);
}

function renderAbility(container: HTMLElement, ability: Ability, hero: Hero): void {
	const usage = FormatLogic.getAbilityType(ability.type);
	const keywords = AbilityLogic.getKeywords(ability, hero).join(', ') || '—';
	const distances = ability.distance.map(d => AbilityLogic.getDistance(d, ability, hero)).join(', ') || '—';
	const cost = ability.cost === 'signature' ? 'Signature' : `${ability.cost} pt${ability.cost === 1 ? '' : 's'}`;

	appendMeta(container, `${usage} · Cost: ${cost} · Keywords: ${keywords} · Distance: ${distances} · Target: ${ability.target || '—'}`);

	ability.sections.forEach(section => {
		switch (section.type) {
			case 'text': {
				const el = document.createElement('div');
				el.className = 'feature-ability-section';
				el.textContent = section.text;
				container.append(el);
				break;
			}
			case 'roll':
				renderPowerRoll(container, section.roll);
				break;
			case 'field': {
				const el = document.createElement('div');
				el.className = 'feature-ability-section';
				el.textContent = `${section.name} (spend ${section.value}): ${section.effect}`;
				container.append(el);
				break;
			}
			case 'package': {
				const el = document.createElement('div');
				el.className = 'feature-ability-section';
				el.textContent = `Package: ${section.tag}`;
				container.append(el);
				break;
			}
		}
	});
}

function renderFeature(container: HTMLElement, feature: Feature, hero: Hero): void {
	const nameEl = document.createElement('div');
	nameEl.className = 'feature-name';
	nameEl.textContent = feature.name || '(unnamed feature)';
	container.append(nameEl);

	if (feature.description) {
		const descEl = document.createElement('div');
		descEl.className = 'feature-description';
		descEl.textContent = feature.description;
		container.append(descEl);
	}

	switch (feature.type) {
		case FeatureType.Text:
			// name + description above is the whole feature; nothing more to add.
			break;

		case FeatureType.Ability:
			renderAbility(container, feature.data.ability, hero);
			break;

		case FeatureType.SkillChoice:
			appendMeta(container, `Selected skills: ${feature.data.selected.join(', ') || '(none selected)'}`);
			break;

		case FeatureType.LanguageChoice:
			appendMeta(container, `Selected languages: ${feature.data.selected.join(', ') || '(none selected)'}`);
			break;

		case FeatureType.Multiple:
			appendSubFeatures(container, feature.data.features, hero);
			break;

		case FeatureType.DomainFeature:
			// data.selected is already Feature[] - HeroLogic/the raw export has
			// already resolved this, so recursing into renderFeature works
			// directly, same as Multiple Features.
			appendSubFeatures(container, feature.data.selected, hero);
			break;

		case FeatureType.ClassAbility: {
			// data only carries selectedIDs (strings), not resolved ability
			// objects - resolve them against hero.class.abilities ourselves,
			// since that's already loaded in the same pipeline. If nothing
			// resolves, name + description above is the documented fallback.
			const resolvedNames = (hero.class?.abilities ?? [])
				.filter(a => feature.data.selectedIDs.includes(a.id))
				.map(a => a.name);
			if (resolvedNames.length > 0) {
				appendMeta(container, `Selected: ${resolvedNames.join(', ')}`);
			}
			break;
		}

		default:
			// Every other feature type in the union (Characteristic Bonus, Perk,
			// Bonus, Package Content, Heroic Resource(Gain), Kit, Choice, Domain,
			// and anything not yet seen in the wild) falls back to name +
			// description, already rendered above. This is the documented
			// behavior in ds-hero-format.md / project-overview.md, not a
			// shortcut - not a bug if a feature here shows no extra detail.
			break;
	}
}

export function renderFeatures(container: HTMLElement, features: ActiveFeature[], hero: Hero): void {
	container.innerHTML = '';

	features.forEach(entry => {
		const li = document.createElement('li');
		li.className = 'feature-item';

		appendMeta(li, `${entry.source}${entry.level !== undefined ? ` · Level ${entry.level}` : ''}`);
		renderFeature(li, entry.feature, hero);

		container.append(li);
	});
}
