class WebSocketManager extends EventTarget {
	constructor(url) {
		super();
		
		this.url = url;
		this.socket = null;
		this.isConnected = false;
		this.reconnectInterval = 3000;
		this.maxRetries = Infinity; 
		this.retryCount = 0;

		this.connect();
	}

	connect() {
		if (this.retryCount >= this.maxRetries) {
			console.error('Max reconnect attempts reached.');
			this.dispatchEvent(new CustomEvent('error', { detail: 'Max reconnect attempts reached.' }));
			return;
		}
	
		this.socket = new WebSocket(this.url);
	
		this.socket.onopen = () => {
			console.log('WebSocket connected.');
			this.isConnected = true;
			this.retryCount = 0; // Reset retry count
			this.dispatchEvent(new CustomEvent('connect', { detail: { url: this.url } }));
		};
	
		this.socket.onclose = (event) => {
			console.warn('WebSocket closed.', event);
			this.isConnected = false;
			this.dispatchEvent(new CustomEvent('close', { detail: { code: event.code, reason: event.reason } }));
			this.reconnect(); // Attempt to reconnect
		};
	
		this.socket.onerror = (error) => {
			console.error('WebSocket error.', error);
			this.dispatchEvent(new CustomEvent('error', { detail: error }));
		};
	
		this.socket.onmessage = (message) => {
			this.dispatchEvent(new CustomEvent('message', { detail: message.data }));
		};
	}

	reconnect() {
		if (!this.isConnected) {
			console.log(`Reconnecting in ${this.reconnectInterval / 1000}s...`);
			setTimeout(() => {
				this.retryCount += 1;
				this.connect();
			}, this.reconnectInterval);
		}
	}

	close() {
		if (this.socket) {
			this.socket.close();
			this.isConnected = false;
		}
	}
}

export default WebSocketManager;
