import { stylus } from 'stylus';

export function StylusWaiting_Start() {
	const elModal = document.getElementById('modal_stylus_waiting');
	elModal.classList.remove('hidden');

	if (elModal.hasEventListeners) {
		return;
	}
	
	// We need to hide this only when connection is established
	stylus.connection.addEventListener('connect', ( e ) => {
		hideElement(elModal);
	});

	elModal.hasEventListeners = true;
}

export function ZLevelWizard_Start() {
	const elModal = document.getElementById('modal_zlevel_start');
	elModal.classList.remove('hidden');
	
	if ( !elModal.hasEventListeners ) {
		const elBtnProceed = elModal.getElementsByClassName('btn_confirm')[0];
		elBtnProceed.addEventListener('click', function(){
			hideElement(elModal);
			ZLevelWizard_Proceed();
		});

		const elBtnCancel = elModal.getElementsByClassName('btn_cancel')[0];
		elBtnCancel.addEventListener('click', function(){
			hideElement(elModal);
		});
	}
	
	elModal.hasEventListeners = true;
}

function ZLevelWizard_Proceed() {
	const elModal = document.getElementById('modal_zlevel_proceed')
	elModal.classList.remove('hidden');

	if ( !elModal.hasEventListeners ) {

		// TODO: add listener for incoming stylus trigger press

		const elBtnCancel = elModal.getElementsByClassName('btn_cancel')[0];
		elBtnCancel.addEventListener('click', function(){
			hideElement(elModal);
		});
	}

	elModal.hasEventListeners = true;
}

function hideElement( el ) {
	if ( !el.classList.contains('hidden') ) {
		el.classList.add('hidden');
	}
}

