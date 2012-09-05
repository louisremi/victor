(function(window,document,Raphael){

Raphael.render = function( wrapper, json, callback ) {
	if ( typeof json == "string" ) {
		json = JSON.parse( json );
	}

	var paper = Raphael( wrapper, json.width, json.height ),
		i = -1,
		length = json.children.length,
		child, style, tmp, elem;

	while ( ++i < length ) {
		child = json.children[i];
		style = child.style;

		// Raphael has strange defaults
		!style.fill && ( style.fill = "none" );
		!style.stroke && ( style.stroke = "none" );

		// convert gradients in raphael format
		if ( typeof style.fill != "string" ) {
			// you can get "to transparent" gradients in raphael by setting the fill-opacity to less than 1
			if ( ( tmp = style.fill.stops[1].substr(7) ) ) {
				style["fill-opacity"] = parseInt( tmp, 16 ) / 255;
			}
			style.fill = style.fill.angle + "-" + style.fill.stops[0].substr(0,7) + "-" + style.fill.stops[1].substr(0,7);
		}

		elem = paper[ child.type ].apply( paper, child.attrs ).attr( style );

		if ( callback ) {
			callback( elem, child );
		}
	}

	return paper;
};

})(window,document,Raphael)