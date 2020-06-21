import React from 'react';

export interface ErrorProps {
	title: string;
	text?: string;
	className?: string;
}

const Error: React.FunctionComponent<ErrorProps> = ({ title, text, className }) => (
	<div className={`error ${className || ''}`}>
		<div className="error-title">{title}</div>
		<div className="error-text">{text}</div>
	</div>
);

export default Error;
