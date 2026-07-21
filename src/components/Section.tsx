import type { ReactNode } from 'react';
import './shared.css';

interface SectionProps {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}

// Native <details>/<summary> for collapsible sections, per
// docs/project-overview.md's "Design" section - no custom accordion
// component, no JS state management for open/closed.
export function Section({ title, defaultOpen = true, children }: SectionProps) {
	return (
		<details className="section" open={defaultOpen}>
			<summary className="section-summary">{title}</summary>
			<div className="section-body">{children}</div>
		</details>
	);
}
