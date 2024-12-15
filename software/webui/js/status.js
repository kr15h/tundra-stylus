import { stylus } from 'stylus';

export function StatusBar_Init() {
	const elWidget = document.getElementById('widget_stylus_connection');

	// TODO: hook into our global websocket connection here.
	//       websocket management would be another module then.
	if (elWidget.hasEventListeners) {
		return;
	}
	
	// We need to hide this only when connection is established
	stylus.connection.addEventListener('connect', ( e ) => {
		const elIndicatorColor = elWidget.getElementsByClassName('indicator-color')[0];

		if (elIndicatorColor.classList.contains('color-red')) {
			elIndicatorColor.classList.remove('color-red');
		}

		if (!elIndicatorColor.classList.contains('color-green')) {
			elIndicatorColor.classList.add('color-green');
		}

		const elIndicatorText = elWidget.getElementsByClassName('indicator-text')[0];
		elIndicatorText.textContent = 'Connected'; 

		if (elIndicatorText.classList.contains('color-red')) {
			elIndicatorText.classList.remove('color-red');
		}

		if (!elIndicatorText.classList.contains('color-green')){
			elIndicatorText.classList.add('color-green');
		}
	});

	stylus.connection.addEventListener('close', ( e ) => {
		const elIndicatorColor = elWidget.getElementsByClassName('indicator-color')[0];

		if (elIndicatorColor.classList.contains('color-green')) {
			elIndicatorColor.classList.remove('color-green');
		}

		if (!elIndicatorColor.classList.contains('color-red')) {
			elIndicatorColor.classList.add('color-red');
		}

		const elIndicatorText = elWidget.getElementsByClassName('indicator-text')[0];
		elIndicatorText.textContent = 'Disconnected'; 

		if (elIndicatorText.classList.contains('color-green')) {
			elIndicatorText.classList.remove('color-green');
		}

		if (!elIndicatorText.classList.contains('color-red')) {
			elIndicatorText.classList.add('color-red');
		}
	});

	elWidget.hasEventListeners = true;
}
