(function(window,document) {

var $fileInput = $("#file-input"),
	$fileButton = $("#file-button"),
	$tigerButton = $("#tiger-button"),
	$canvasInput = $("#canvas-input"),
	$jsonOutput = $("#json-output"),
	$canvasOutput = $("#canvas-output"),
	$svgFrame = window.frames[0],
	BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

// reset textarea
$jsonOutput.value = "";

function onfileButtonClick( event ) {
	// reset fields
	$canvasInput.innerHTML = "";
	$canvasInput.style.backgroundImage = "";
	$jsonOutput.value = "";
	$canvasOutput.innerHTML = "";

	// add loader
	c( $canvasInput, "add", "loading" );
	c( $jsonOutput, "add", "loading" );
	c( $canvasOutput, "add", "loading" );

	// proxy click to real file-input
	event && $fileInput.click();
}
$fileButton.onclick = onfileButtonClick;

$fileInput.onchange = function( event ) {
	if ( !$fileInput.files.length ) { return; }

	convertFile( $fileInput.files[0] );
};

$tigerButton.onclick = function() {
	// prepare the page as if the file button was clicked
	onfileButtonClick( false );

	var fileReq = new XMLHttpRequest();
	// prepend /victor to the sample URL, when on github
	fileReq.open("GET", ( /github/.test( location ) ? "/victor" : "" ) + "/samples/tiger.svg", true);
	fileReq.responseType = "arraybuffer";
	 
	fileReq.onload = function() {
	  var blobBuilder = new BlobBuilder();
	  blobBuilder.append( fileReq.response );
	  
	  convertFile( blobBuilder.getBlob("image/svg+xml") );
	};
	fileReq.send();
};

function onjsonchange() {
	if ( $jsonOutput.value == "" ) { return; }

	var json = JSON.parse( $jsonOutput.value ),
		width = Math.ceil( json.width ),
		height = Math.ceil( json.height * 300 / 280 );

	json.width = 280;
	json.height = 300;

	$canvasOutput.innerHTML = "";
	c( $canvasOutput, "remove", "loading" );

	dummyRenderer( $canvasOutput, json ).setViewBox(0,0,width,height,true);
}
$jsonOutput.onchange = onjsonchange;

/* Utilities ------------------------------------------------------*/
function convertFile( file ) {
	var freader1 = new FileReader(),
		freader2 = new FileReader();

	// load the svg into the iframe
	freader1.onload = function( e ) {
		$svgFrame.document.body.innerHTML = e.target.result;
		// convert the thumbnail to JSON
		$jsonOutput.value = JSON.stringify( svgtojs( $svgFrame.document.body.firstElementChild ) );
		onjsonchange();

		c( $jsonOutput, "remove", "loading" );
	};
	freader1.readAsText( file );

	// display a thumbnail of the svg
	freader2.onload = function( e ) {
		$canvasInput.style.backgroundImage = "url('" + e.target.result + "')";

		c( $canvasInput, "remove", "loading" );
	};
	freader2.readAsDataURL( file );
}

function dummyRenderer( wrapper, json ) {
	if ( typeof json == "string" ) {
		json = JSON.parse( json );
	}

	var paper = Raphael( wrapper, json.width, json.height );

	_.each( json.children, function( child ) {
		var style = child.style,
			tmp;

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

		paper[ child.type ].apply( paper, child.attrs ).attr( style );
	});

	return paper;
}

function $( selector, context ) {
	return ( context || document ).querySelector( selector );
}

// c, an expressive className manipulation library
function c(e,v,n,c,r){r=e[c='className'].replace(RegExp('(^| ) *'+n+' *( |$)','g'),'');return'has'==v?r!=e[c]:e[c]={add:1,toggle:r==e[c]}[v]?r+' '+n:r};

})(window,document);