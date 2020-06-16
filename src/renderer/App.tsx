import React from 'react';
import { Status } from '../common/ipcTypes';
import Error from './Error';
import OnAir from './OnAir';

interface AppProps {
	status: Status;
}

const App: React.FunctionComponent<AppProps> = ({ status }) => {
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
