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

