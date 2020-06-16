import React from 'react';

export interface OnAirProps {
	hidden: boolean;
	muted: boolean;
}

const OnAir: React.FunctionComponent<OnAirProps> = ({ hidden, muted }) => (
	<div className="on-air-container">
		<div className="on-air-dot" data-full={!hidden} data-outline={!muted}></div>
		<div className="on-air-text">{onAirText(hidden, muted)}</div>
	</div>
);

export default OnAir;

const onAirText = (hidden: boolean, muted: boolean): string => {
	if (hidden && muted) return 'Off Air'; // Impossible, window would be hidden
	if (hidden && !muted) return 'On Mic';
	return 'On Air';
};
