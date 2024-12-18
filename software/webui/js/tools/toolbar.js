export function Init_ToolBar() {
	elToolBar = document.getElementById( 'widget_tools' );

}

function deselectAllTools() {
	elToolBar = document.getElementById( 'widget_tools' );
	buttonElements = elToolBar.getElementsByTagName( 'button' );

	for (const el of buttonElements) {
		if ( el.classList.contains( 'active' ) ) {
			el.classList.remove( 'active' )
		}
	}
}