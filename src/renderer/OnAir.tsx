import React from 'react';

export interface OnAirProps {
	hidden: boolean;
	muted: boolean;
	className?: string;
}

const OnAir: React.FunctionComponent<OnAirProps> = ({ hidden, muted, className }) => (
	<div className={`on-air-container ${(!hidden || !muted) && 'pulsing'} ${className || ''}`}>
		<div
			className="on-air-dot"
			data-full={!hidden}
			data-outline={!muted}
			hidden={hidden && muted}
		></div>
		<div className="on-air-text">{onAirText(hidden, muted)}</div>
	</div>
);

export default OnAir;

const onAirText = (hidden: boolean, muted: boolean): string => {
	if (hidden && muted) return 'Off Air'; // Impossible, window would be hidden
	if (hidden && !muted) return 'On Mic';
	return 'On Air';
};
