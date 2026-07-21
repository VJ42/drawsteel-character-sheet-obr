import { useEffect, useState } from 'react';
import './shared.css';

interface EditableTextProps {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	multiline?: boolean;
	placeholder?: string;
}

// Edit-in-place, save on blur/enter - no separate view/edit mode toggle for
// now (see docs/handoff.md's build plan).
export function EditableText({ label, value, onChange, multiline, placeholder }: EditableTextProps) {
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	function commit() {
		if (draft !== value) {
			onChange(draft);
		}
	}

	const field = multiline
		? (
			<textarea
				className="editable-text-input editable-text-textarea"
				value={draft}
				placeholder={placeholder}
				onChange={e => setDraft(e.target.value)}
				onBlur={commit}
			/>
		)
		: (
			<input
				type="text"
				className="editable-text-input"
				value={draft}
				placeholder={placeholder}
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
		<label className="editable-text">
			<span className="editable-text-label">{label}</span>
			{field}
		</label>
	);
}
