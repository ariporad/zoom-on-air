import React from 'react';
import { Status, ZoomAction } from '../common/ipcTypes';
import Error from './Error';
import OnAir from './OnAir';
import ControlPanel from './ControlPanel';
import { ipcRenderer, remote } from 'electron';

interface AppProps {
	status: Status;
}

const makeActionHandler = (action: ZoomAction) => (): void => {
	ipcRenderer.send('zoom-action', action);
};

const App: React.FunctionComponent<AppProps> = ({ status }) => {
	switch (status.type) {
		case 'error':
			return <Error title={status.title} text={status.text} />;
		case 'needs-perms':
			return (
				<>
					<Error
						title={'Accessibility Access Required!'}
						text={
							'Zoom on Air needs accessibility access to control Zoom. Click here to grant it.'
						}
						className="no-hover"
					/>
					<ControlPanel
						className="only-hover"
						buttons={[
							{
								text: 'Grant Access',
								visible: true,
								onClick() {
									remote.systemPreferences.isTrustedAccessibilityClient(true);
								},
							},
						]}
					/>
				</>
			);
		case 'in-meeting':
			return (
				<>
					<OnAir hidden={status.hidden} muted={status.muted} className="no-hover" />
					<ControlPanel
						buttons={[
							{
								text: 'Mute',
								onClick: makeActionHandler(ZoomAction.Mute),
								visible: !status.muted,
							},
							{
								text: 'Unmute',
								onClick: makeActionHandler(ZoomAction.Unmute),
								visible: status.muted,
							},
							{
								text: 'Hide',
								onClick: makeActionHandler(ZoomAction.Hide),
								visible: !status.hidden,
							},
							{
								text: 'Unhide',
								onClick: makeActionHandler(ZoomAction.Unhide),
								visible: status.hidden,
							},
						]}
						className="only-hover"
					/>
				</>
			);
		case 'hidden':
		case 'loading':
		default:
			return <></>;
	}
};

export default App;
