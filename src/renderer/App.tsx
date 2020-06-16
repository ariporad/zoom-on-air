import React from 'react';
import { Status } from '../common/ipcTypes';
import Error from './Error';
import OnAir from './OnAir';
import ControlPanel from './ControlPanel';

interface AppProps {
	status: Status;
}

const App: React.FunctionComponent<AppProps> = ({ status }) => {
	switch (status.type) {
		case 'error':
			return <Error title={status.title} text={status.text} />;
		case 'in-meeting':
			return (
				<>
					<OnAir hidden={status.hidden} muted={status.muted} className="no-hover" />
					<ControlPanel
						hidden={status.hidden}
						muted={status.muted}
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
