import React from 'react';

export interface ErrorProps {
	title: string;
	text?: string;
}

const Error: React.FunctionComponent<ErrorProps> = ({ title, text }) => (
	<div className="error">
		<div className="error-title">{title}</div>
		<div className="error-text">{text}</div>
	</div>
);

export default Error;
