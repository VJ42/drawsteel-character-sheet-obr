import { useState } from 'react';
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
//
// Sheet UI, not builder UI: by default this shows only what's already
// chosen (names only, no descriptions, no unselected options) - the full
// checklist is one explicit "Edit selection" click away, not shown
// up front.
export function ToggleChoice({ title, description, options, selected, budget, onChange }: ToggleChoiceProps) {
	const [ isEditing, setIsEditing ] = useState(false);

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

	const selectedOptions = options.filter(o => selectedIds.has(o.feature.id));

	return (
		<fieldset className="toggle-choice">
			<legend className="toggle-choice-legend">{title} ({spent} / {budget} pts)</legend>

			{!isEditing && (
				<div className="toggle-choice-summary">
					{selectedOptions.length > 0 && (
						<ul className="toggle-choice-summary-list">
							{selectedOptions.map(o => <li key={o.feature.id}>{o.feature.name}</li>)}
						</ul>
					)}
					<button type="button" className="toggle-choice-edit-button" onClick={() => setIsEditing(true)}>
						{selectedOptions.length > 0 ? 'Edit selection' : 'Choose options'}
					</button>
				</div>
			)}

			{isEditing && (
				<>
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
					<button type="button" className="toggle-choice-edit-button" onClick={() => setIsEditing(false)}>
						Done
					</button>
				</>
			)}
		</fieldset>
	);
}
