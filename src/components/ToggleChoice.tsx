import type { Feature } from '@/models/feature';
import './shared.css';

interface ToggleChoiceProps {
	title: string;
	description?: string;
	options: { feature: Feature; value: number }[];
	selected: Feature[];
	budget: number;
	onChange: (selected: Feature[]) => void;
}

// Toggles among options embedded directly on the hero object itself (not
// catalog-backed) - e.g. an ancestry's Choice feature, where `options` is a
// fixed, point-costed list and `budget` caps total spend, not item count.
export function ToggleChoice({ title, description, options, selected, budget, onChange }: ToggleChoiceProps) {
	const selectedIds = new Set(selected.map(f => f.id));
	const spent = options
		.filter(o => selectedIds.has(o.feature.id))
		.reduce((sum, o) => sum + o.value, 0);

	function toggle(option: { feature: Feature; value: number }) {
		if (selectedIds.has(option.feature.id)) {
			onChange(selected.filter(f => f.id !== option.feature.id));
		} else {
			onChange([ ...selected, option.feature ]);
		}
	}

	return (
		<fieldset className="toggle-choice">
			<legend className="toggle-choice-legend">{title} ({spent} / {budget} pts)</legend>
			{description && <p className="toggle-choice-description">{description}</p>}
			<ul className="toggle-choice-options">
				{options.map(o => {
					const isSelected = selectedIds.has(o.feature.id);
					const disabled = !isSelected && (spent + o.value > budget);
					return (
						<li key={o.feature.id} className="toggle-choice-option">
							<label className={disabled ? 'toggle-choice-option-label disabled' : 'toggle-choice-option-label'}>
								<input
									type="checkbox"
									checked={isSelected}
									disabled={disabled}
									onChange={() => toggle(o)}
								/>
								{o.feature.name} ({o.value} pt{o.value === 1 ? '' : 's'})
							</label>
							{o.feature.description && <p className="toggle-choice-option-description">{o.feature.description}</p>}
						</li>
					);
				})}
			</ul>
		</fieldset>
	);
}
