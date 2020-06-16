import React from 'react';
import { ipcRenderer } from 'electron';
import { ZoomAction } from '../common/ipcTypes';

interface ButtonProps {
	className?: string;
	hidden?: boolean;
	onClick?: () => void;
}

const Button: React.FunctionComponent<ButtonProps> = ({ className, ...props }) => (
	<button className={`${className} control-panel-button`} {...props} />
);

export interface ControlPanelProps {
	hidden: boolean;
	muted: boolean;
	className?: string;
}

interface ControlPanelState {
	hidden: boolean;
	muted: boolean;
}

export default class ControlPanel extends React.Component<ControlPanelProps> {
	makeActionHandler(action: ZoomAction) {
		return (): void => {
			ipcRenderer.send('zoom-action', action);
		};
	}

	render() {
		const { muted, hidden, className } = this.props;

		return (
			<div className={`control-panel ${className || ''}`}>
				<Button
					className="mute"
					hidden={muted}
					onClick={this.makeActionHandler(ZoomAction.Mute)}
				>
					Mute
				</Button>
				<Button
					className="unmute"
					hidden={!muted}
					onClick={this.makeActionHandler(ZoomAction.Unmute)}
				>
					Unmute
				</Button>
				<Button
					className="hide"
					hidden={hidden}
					onClick={this.makeActionHandler(ZoomAction.Hide)}
				>
					Hide
				</Button>
				<Button
					className="unhide"
					hidden={!hidden}
					onClick={this.makeActionHandler(ZoomAction.Unhide)}
				>
					Unhide
				</Button>
			</div>
		);
	}
}
