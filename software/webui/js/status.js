import { state } from 'state';
import { SetOriginHelp_Show } from 'wizard'; 

// TODO: pass the TundraStylus instance here directly instead of via state
export function StatusBar_Init() {
	const elWidget = document.getElementById('widget_stylus_connection');

	// TODO: hook into our global websocket connection here.
	//       websocket management would be another module then.
	if (elWidget.hasEventListeners) {
		return;
	}
	
	// We need to hide this only when connection is established
	state.stylus.connection.addEventListener('connect', (e) => {
		// Set up color indicator to green as soon as connection is established
		const elIndicatorColor = elWidget.getElementsByClassName('indicator-color')[0];

		if (elIndicatorColor.classList.contains('color-red')) 
			elIndicatorColor.classList.remove('color-red');

		if (!elIndicatorColor.classList.contains('color-green')) 
			elIndicatorColor.classList.add('color-green');

		// Set up text indicactor to "Connected" and text color to green
		const elIndicatorText = elWidget.getElementsByClassName('indicator-text')[0];
		elIndicatorText.textContent = 'Connected'; 

		if (elIndicatorText.classList.contains('color-red'))
			elIndicatorText.classList.remove('color-red');

		if (!elIndicatorText.classList.contains('color-green'))
			elIndicatorText.classList.add('color-green');
	});

	state.stylus.connection.addEventListener('close', (e) => {
		// Set color indicator to red as soon as connection is closed
		const elIndicatorColor = elWidget.getElementsByClassName('indicator-color')[0];

		if (elIndicatorColor.classList.contains('color-green'))
			elIndicatorColor.classList.remove('color-green');

		if (!elIndicatorColor.classList.contains('color-red'))
			elIndicatorColor.classList.add('color-red');

		// Set text indicator to "Disconnected" and its color to red
		const elIndicatorText = elWidget.getElementsByClassName('indicator-text')[0];
		elIndicatorText.textContent = 'Disconnected'; 

		if (elIndicatorText.classList.contains('color-green'))
			elIndicatorText.classList.remove('color-green');

		if (!elIndicatorText.classList.contains('color-red'))
			elIndicatorText.classList.add('color-red');
	});

	// Attach event listeners to widget_scene_setup
	const elSceneSetupWidget = document.getElementById('widget_scene_setup');
	const elSetOriginButton = elSceneSetupWidget.getElementsByClassName('button-set-origin')[0];
	const elHelpButton = elSceneSetupWidget.getElementsByClassName('button-help')[0];

	elSetOriginButton.addEventListener('click', (e) => {
		SetOriginHelp_Show();
	});

	elWidget.hasEventListeners = true;
}
