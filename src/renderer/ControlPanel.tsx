import React from 'react';

interface ButtonProps {
	className?: string;
	hidden?: boolean;
	onClick?: () => void;
}

const Button: React.FunctionComponent<ButtonProps> = ({ className, ...props }) => (
	<button className={`${className} control-panel-button`} {...props} />
);

export interface ControlPanelProps {
	buttons: { text: string; visible?: boolean; className?: string; onClick?: () => void }[];

	className?: string;
}

export default class ControlPanel extends React.Component<ControlPanelProps> {
	render() {
		const { buttons, className } = this.props;

		return (
			<div className={`control-panel ${className || ''}`}>
				{buttons.map((button) => (
					<Button
						className={button.className}
						hidden={button.visible === false}
						onClick={button.onClick}
					>
						{button.text}
					</Button>
				))}
			</div>
		);
	}
}
