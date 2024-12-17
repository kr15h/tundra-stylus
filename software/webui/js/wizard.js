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

export function SetOriginHelp_Show() {
	const elModal = document.getElementById('modal_set_origin_help');
	elModal.classList.remove('hidden');
	
	if ( !elModal.hasEventListeners ) {
		const elBtnOk = elModal.getElementsByClassName('btn-ok')[0];
		elBtnOk.addEventListener('click', function(){
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

