import { useEffect, useState } from 'react';
import './shared.css';

interface EditableNumberProps {
	label?: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
}

export function EditableNumber({ label, value, onChange, min, max }: EditableNumberProps) {
	const [draft, setDraft] = useState(String(value));

	useEffect(() => {
		setDraft(String(value));
	}, [value]);

	function commit() {
		const parsed = Number(draft);
		if (draft.trim() !== '' && !Number.isNaN(parsed) && parsed !== value) {
			onChange(parsed);
		} else {
			setDraft(String(value));
		}
	}

	const field = (
		<input
			type="number"
			className="editable-number-input"
			value={draft}
			min={min}
			max={max}
			onChange={e => setDraft(e.target.value)}
			onBlur={commit}
			onKeyDown={e => {
				if (e.key === 'Enter') {
					e.currentTarget.blur();
				}
			}}
		/>
	);

	if (!label) {
		return field;
	}

	return (
		<label className="editable-number">
			<span className="editable-number-label">{label}</span>
			{field}
		</label>
	);
}
