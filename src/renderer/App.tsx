import React from 'react';
import { Status, ZoomAction } from '../common/ipcTypes';
import Error from './Error';
import OnAir from './OnAir';
import { ipcRenderer } from 'electron';

interface AppProps {
	status: Status;
}

const App: React.FunctionComponent<AppProps> = ({ status }) => {
	return (
		<>
			<button onClick={() => ipcRenderer.send('zoom-action', ZoomAction.Unmute)}>
				Unmute
			</button>
			<button onClick={() => ipcRenderer.send('zoom-action', ZoomAction.Mute)}>Mute</button>
			<button onClick={() => ipcRenderer.send('zoom-action', ZoomAction.Unhide)}>
				Start Video
			</button>
			<button onClick={() => ipcRenderer.send('zoom-action', ZoomAction.Hide)}>
				Stop Video
			</button>
		</>
	);
	switch (status.type) {
		case 'error':
			return <Error title={status.title} text={status.text} />;
		case 'in-meeting':
			return <OnAir hidden={status.hidden} muted={status.muted} />;
		case 'hidden':
		case 'loading':
		default:
			return <></>;
	}
};

export default App;
