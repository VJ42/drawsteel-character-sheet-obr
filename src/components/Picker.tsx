import { useEffect, useId, useState } from 'react';
import './shared.css';

export interface PickerOption {
	id: string;
	name: string;
}

interface PickerProps {
	label: string;
	options: PickerOption[];
	currentName: string;
	onSelect: (option: PickerOption) => void;
	onFreeText?: (name: string) => void;
	allowFreeText?: boolean;
}

// Searchable dropdown over a supplied catalog, with a free-text fallback for
// entries not in the catalog at all - built on native <input list>/<datalist>
// rather than a custom widget, matching the project's "prefer native HTML"
// design direction (see docs/project-overview.md). Not filtered by any
// legality/eligibility constraint - lists everything it's given.
export function Picker({ label, options, currentName, onSelect, onFreeText, allowFreeText = true }: PickerProps) {
	const [text, setText] = useState(currentName);
	const listId = useId();

	useEffect(() => {
		setText(currentName);
	}, [currentName]);

	function commit() {
		const match = options.find(o => o.name === text);
		if (match) {
			onSelect(match);
			return;
		}

		if (allowFreeText && onFreeText && text !== currentName) {
			onFreeText(text);
			return;
		}

		// No catalog match and free text isn't allowed here - revert.
		setText(currentName);
	}

	return (
		<label className="picker">
			<span className="picker-label">{label}</span>
			<input
				className="picker-input"
				list={listId}
				value={text}
				onChange={e => setText(e.target.value)}
				onBlur={commit}
			/>
			<datalist id={listId}>
				{options.map(o => <option key={o.id} value={o.name} />)}
			</datalist>
		</label>
	);
}
