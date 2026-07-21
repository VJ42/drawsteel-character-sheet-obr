// Standalone, terminal-only proof that the vendored Forge Steel port works
// end-to-end inside this project (not just in the original Node harness).
// Run with: npm run verify
//
// SourcebookLogic.getSourcebooks() reaches FeatureFlags, which reads
// localStorage at call time - shim it before anything runs, per
// docs/porting-notes.md.
globalThis.localStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
	clear: () => {},
	key: () => null,
	length: 0
} as unknown as Storage;

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { Hero } from '@/models/hero';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { HeroUpdateLogic } from '@/logic/update/hero-update-logic';
import { HeroLogic } from '@/logic/hero-logic';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, '../fixtures/Unnamed_Hero.ds-hero');

console.log(`Reading fixture: ${fixturePath}`);
const raw = readFileSync(fixturePath, 'utf-8');
const hero = JSON.parse(raw) as Hero;
console.log(`Parsed hero id: ${hero.id}`);
console.log(`Hero name: '${hero.name}'`);
console.log(`sourcebookIDs: ${hero.sourcebookIDs.join(', ')}`);

const sourcebooks = SourcebookLogic.getSourcebooks()
	.filter(sb => hero.sourcebookIDs.includes(sb.id));
console.log(`Filtered sourcebooks: ${sourcebooks.map(sb => sb.name).join(', ')} (${sourcebooks.length} total)`);

HeroUpdateLogic.updateHero(hero, sourcebooks);
console.log('HeroUpdateLogic.updateHero() completed.');

console.log('');
console.log('=== Derived values ===');

const stamina = HeroLogic.getStamina(hero);
console.log(`stamina: ${stamina}`);

const windedThreshold = HeroLogic.getWindedThreshold(hero);
console.log(`windedThreshold: ${windedThreshold}`);

const recoveries = HeroLogic.getRecoveries(hero);
console.log(`recoveries: ${recoveries}`);

const recoveryValue = HeroLogic.getRecoveryValue(hero);
console.log(`recoveryValue: ${recoveryValue}`);

const speed = HeroLogic.getSpeed(hero);
console.log(`speed.value: ${speed.value}`);
console.log(`speed.modes: ${JSON.stringify(speed.modes)}`);

const stability = HeroLogic.getStability(hero);
console.log(`stability: ${stability}`);

const disengage = HeroLogic.getDisengage(hero);
console.log(`disengage: ${disengage}`);

const size = HeroLogic.getSize(hero);
console.log(`size.value: ${size.value}`);
console.log(`size.mod: '${size.mod}'`);

const skills = HeroLogic.getSkills(hero, sourcebooks);
console.log(`skills.count: ${skills.length}`);
console.log(`skills.names: ${skills.map(s => s.name).join(', ')}`);

const languages = HeroLogic.getLanguages(hero, sourcebooks);
console.log(`languages.count: ${languages.length}`);
console.log(`languages.names: ${languages.map(l => l.name).join(', ')}`);

const kits = HeroLogic.getKits(hero);
console.log(`kits.count: ${kits.length}`);
console.log(`kits.names: ${kits.map(k => k.name).join(', ')}`);

const heroicResources = HeroLogic.getHeroicResources(hero);
console.log(`heroicResources.count: ${heroicResources.length}`);
console.log(`heroicResources.names: ${heroicResources.map(r => r.name).join(', ')}`);

const features = HeroLogic.getFeatures(hero);
console.log(`featureCount: ${features.length}`);

console.log('');
console.log('=== Done ===');
