/*
 * dependencies: underscore, Raphael
 *
 */
(function(window,document,_,Raphael,undefined){

var Shapes = {
		path: ["d"],
		polygon: ["points"],
		text: ["x","y","textContent"],
		image: ["src","x","y","width","height"],
		rect: ["x","y","width","height","rx"],
		circle: ["cx","cy","r"],
		ellipse: ["cx","cy","rx","ry"]
	},
	Styles = {
		"fill": "none",
		"fill-opacity": 1,
		"font": "sans-serif",
		"font-size": "14px",
		"font-weight": "normal",
		"stroke": "none",
		"stroke-opacity": 1,
		"stroke-width": "1px",
		"transform": "none"
	},
	transform,
	prefixes = [
		"WebkitT",
		"MozT",
		"msT",
		"OT",
		"t"
	],
	divStyle,
	serializeHooks,
	rfont = /^font/,
	risrgb = /^rgb\(/,
	rpoints = /(\d*,\d*) /,
	rrgb = /\D*(\d*)\D*/g,
	risgradient = /^url\(/,
	rgradient = /.*?#(.*?)['"].*/,
	rwhitespace = /\s+/g,
	rmeaninglessSeparator = /,?([a-zA-Z-]),?/g,
	rround = /(-?\d.*?)([-, a-zA-Z]|$)/g,
	rmeaningless0 = /(\D-?)0\./g;

// Which transform property should we use?
divStyle = document.createElement("div").style;
_.each(prefixes, function(prefix) {
	if ( prefix + "ransform" in divStyle ) {
		transform = prefix + "ransform";
	}
});

window.svgtojs = function( svg, precision ) {
	// query all elements with supported nodeName
	var elems = svg.querySelectorAll(Object.keys(Shapes).join()),
		jsobj = {
			width: parseFloat( svg.getAttribute("width") ),
			height: parseFloat( svg.getAttribute("height") )
		},
		children = [];

	// loop through all elems
	_.each( elems, function( elem ) {
		var nodeName = elem.nodeName,
			computedStyle = getComputedStyle( elem ),
			id = elem.id || undefined,
			attrs = [],
			style = {};

		// collect all meaningful attributes for that shape
		_.each( Shapes[ nodeName ], function( attrName ) {
			// get attribute value, textContent requires a special treatment
			var tmp = attrName == "textContent" ? elem[ attrName ] : elem.getAttribute( attrName );

			// apply serialize hook if any
			if ( serializeHooks[ attrName ] ) {
				tmp = serializeHooks[ attrName ]( tmp, precision || .1 );
			}

			attrs.push( tmp );
		});

		// collect all meaningful styles for that shape
		_.each( Styles, function( defaultValue, prop ) {
			// ignore font related properties on non text elements
			if ( rfont.test( prop ) && nodeName != "text" ) { return; }

			var tmp = computedStyle.getPropertyValue( prop == "transform" ? transform : prop );
			
			if ( tmp != defaultValue ) {
				// apply serialize hook if any
				if ( serializeHooks[ prop ] ) {
					tmp = serializeHooks[ prop ]( tmp, svg );
				}

				style[ prop ] = tmp;
			}
		});

		// add the shape to the list
		children.push({
			// polygons are converted to paths
			type: nodeName == "polygon" ? "path" : nodeName,
			id: id,
			attrs: attrs,
			style: style
		});
	});


	jsobj.children = children;
	return jsobj;
};

function serializeColor( color, svg ) {
	// rgb( ... ) color
	if ( risrgb.test( color ) ) {
		color = "#" + color.replace( rrgb, function( a, b ) {
			return b ? (+b < 15 ? "0" : "") + (+b).toString(16) : b;
		});

	// gradient
	} else if ( risgradient.test( color ) ) {
		var gradient = svg.getElementById( color.replace( rgradient, "$1") ),
			stops = svg.getElementById( gradient.getAttribute("xlink:href").replace("#","") ).getElementsByTagName("stop"),
			stopValues = {};
		
		if ( gradient.nodeName == "linearGradient" ) {
			_.each( stops, function( stop ) {
				var computedStyle = getComputedStyle( stop ),
					colour = serializeColor( computedStyle.getPropertyValue("stop-color") ),
					opacity = computedStyle.getPropertyValue("stop-opacity");

				// combine color and opacity if required
				if ( opacity != "1" ) {
					colour = colour + ( parseFloat( opacity ) * 255 ).toString(16);
				}

				stopValues[ stop.getAttribute( "offset" ) || 0 ] = colour;
			});

			color = {
				angle: calculateAngle( gradient ),
				stops: stopValues
			};

		// radial gradient aren't supported yet
		} else {
			color = undefined;
		}

	} else {
		color = undefined;
	}

	return color;
};

function calculateAngle( grad ) {
	var x1 = grad.getAttribute("x1"),
		y1 = grad.getAttribute("y1"),
		x2 = grad.getAttribute("x2"),
		y2 = grad.getAttribute("y2");

	return ( 360 + Math.round( Math.atan2( y2 - y1, x2 - x1 ) * 100 ) % 360 );
}

// converts a serie of points to a path equivalent
function serializePoints(a,b) {
	return simplify("M"+a.replace(rpoints,"$1L")+"Z",b);
};

// simplify( pathStr, precision ); with 0.1 precision, 0.333 => 0.3, with 0.01 precision 0.333 => 0.33
function simplify(a,b) {
	// normalize whitespaces
	a = a.replace(rwhitespace," ");

	// convert the path to absolute before rounding it
	// this ensures rounding errors don't add up
	a = Raphael._pathToAbsolute( a ).toString();

	// round path
	a = a.replace(rround,function(a,c,d) {
		return Math.round(parseFloat(c)/b)/(1/b)+d;
	});

	// convert path to relative, this generally reduces the weight
	a = Raphael.pathToRelative( a );

	// remove redondant commands from path
	var currCommand
		tmp = "";
	_.each(a, function( segment ) {
		if ( segment[0] != currCommand ) {
			currCommand = segment[0];
			tmp += currCommand;
		} else {
			tmp += ","
		}
		tmp += segment.splice(1).join();
	});

	// remove meaningless separators and zero
	return tmp.replace(rmeaninglessSeparator,"$1").replace(rmeaningless0,"$1.");
}

serializeHooks = {
	d: simplify,
	points: serializePoints,
	fill: serializeColor,
	stroke: serializeColor
};

})(window,document,_,Raphael);