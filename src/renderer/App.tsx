import React from 'react';
import { Status } from '../common/ipcTypes';

interface AppProps {
	status: Status;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const App: React.FunctionComponent<AppProps> = ({ status }) => (
	<>
		<pre>{JSON.stringify(status)}</pre>
	</>
);

export default App;
