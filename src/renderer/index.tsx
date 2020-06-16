import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import { Status } from '../common/ipcTypes';
import { ipcRenderer } from 'electron';

interface ContainerState {
	Component: React.ComponentType<{ status: Status }>;
	status: Status;
}

/**
 * Handles hot reloading and receiving state from the main process.
 */
class Container extends React.Component<{}, ContainerState> {
	constructor(props: {}) {
		super(props);
		this.state = { Component: require('./App').default, status: { type: 'loading' } };
	}
	componentDidMount() {
		if ((module as any).hot) {
			(module as any).hot.accept('./App', () => {
				console.info('HMR Update Received, Reloading Entire Tree...');
				this.setState({ Component: require('./App').default });
			});
		}

		ipcRenderer.on('status', (e: Electron.IpcRendererEvent, status: Status): void => {
			console.log('New Status:', status);
			this.setState({ status });
		});
	}

	render() {
		const { Component, status } = this.state;
		return <Component status={status} />;
	}
}

ReactDOM.render(<Container />, document.getElementById('app'));
