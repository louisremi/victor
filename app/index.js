(function(window,document,Backbone,Raphael,_) {

var BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

var SvgFile = Backbone.Model.extend({
	defaults: {
		loading: false,
		file: null
	},

	// load a local svg file (from a file input) or a remote file using a URL
	load: function( file ) {
		var self = this,
			freader1,
			freader2;

		self.set( "loading", true );

		// loading remote url
		if ( typeof file == "string" ) {
			var fileReq = new XMLHttpRequest();
			// prepend /victor to the sample URL, when on github
			fileReq.open("GET", ( /github/.test( location ) ? "/victor" : "" ) + file, true);
			fileReq.responseType = "arraybuffer";
			 
			fileReq.onload = function() {
				self.load( new Blob( [fileReq.response], {type: "image/svg+xml" } ) );
			};
			fileReq.send();
		
		// loading a file
		} else {
			freader1 = new FileReader();
			freader2 = new FileReader();

			// convert the svg to a html string
			freader1.onload = function( e ) {
				self.set( "loading", false );
				self.set( "html", e.target.result );
			};
			freader1.readAsText( file );

			// convert the svg to a thumbnail
			freader2.onload = function( e ) {
				self.set( "dataUrl", e.target.result );
			};
			freader2.readAsDataURL( file );
		}
	}
});

var SvgView = Backbone.View.extend({
	render: function( html ) {
		this.el.style.backgroundImage = "url('" + this.model.get( "dataUrl" ) + "')";
	}
});

var JsonOutput = Backbone.Model.extend({
	defaults: {
		loading: false,
		rescape: /'|\\/g,
		renderer: '(function(j,k,e){e.render=function(c,b,f){"string"==typeof b&&(b=JSON.parse(b));for(var c=e(c,b.width,b.height),g=-1,i=b.children.length,d,a,h;++g<i;){d=b.children[g];a=d.style;!a.fill&&(a.fill="none");!a.stroke&&(a.stroke="none");if("string"!=typeof a.fill){if(h=a.fill.stops[1].substr(7))a["fill-opacity"]=parseInt(h,16)/255;a.fill=a.fill.angle+"-"+a.fill.stops[0].substr(0,7)+"-"+a.fill.stops[1].substr(0,7)}a=c[d.type].apply(c,d.attrs).attr(a);f&&f(a,d)}return c}})(window,document,Raphael);',
		json: "",
		wrapperId: "wrapperId",
		// options
		bundle: true
	},

	// return a json string, formated according to the options
	toJS: function() {
		var string = this.get("json");

		if ( this.get("bundle") ) {
			string =
				"(function(w,R){\n" +
					"var svgObj=eval('" + string.replace( this.get("rescape"), "\\$&" ) + "');\r\r" +
					this.get("renderer") + "\r\r" +
					"R.render('" + this.get("wrapperId") + "',svgObj);" +
				"})(window,Raphael);";
		}

		this.set( "loading", false );

		return string;
	}
});

var JsonView = Backbone.View.extend({
	initialize: function() {
		this.el.value = "";
	},

	render: function() {
		this.el.value = this.model.toJS();
	}
});

var RaphaelView = Backbone.View.extend({
	events: {
		change: "render"
	},

	render: function( json ) {
		if ( json == "" ) { return; }

		var obj = JSON.parse( json ),
			width = Math.ceil( obj.width ),
			height = Math.ceil( obj.height );

		obj.width = 300;
		obj.height = 300;

		this.el.innerHTML = "";

		Raphael.render( this.el, obj ).setViewBox(0,0,width,height,true);
	}
});

var $fileInput = $("#file-input"),
	$fileButton = $("#file-button"),
	$tigerButton = $("#tiger-button"),
	$svgFrame = window.frames[0].document,
	svgFile = _.extend( (new SvgFile()), Backbone.Events),
	jsonOutput = _.extend( (new JsonOutput()), Backbone.Events),
	svgView = new SvgView({
		el: $("#canvas-input"),
		model: svgFile
	}),
	jsonView = new JsonView({
		el: $("#json-output"),
		model: jsonOutput
	}),
	raphaelView = new RaphaelView({
		el: $("#canvas-output"),
		model: jsonOutput
	});

$fileButton.onclick = function() {
	svgFile.set( "loading", true );
	jsonOutput.set( "loading", true );

	$fileInput.click();
};

svgFile.on("change", function() {
	if ( svgFile.hasChanged( "loading" ) ) {
		svgView.el.innerHTML = "";
		c( svgView.el,  svgFile.get("loading") ? "add" : "remove", "loading" );
	}
});

svgFile.on("change", function() {
	if ( svgFile.hasChanged( "dataUrl" ) ) {
		svgView.render();
	}
});

svgFile.on("change", function() {
	if ( svgFile.hasChanged( "html" ) ) {
		$svgFrame.body.innerHTML = svgFile.get("html");
		jsonOutput.set( "json", JSON.stringify( svgtojs( $svgFrame.querySelector("svg") ) ) );
		jsonView.render();
	}
});

jsonOutput.on("change", function() {
	if ( jsonOutput.hasChanged("loading") ) {
		c( jsonView.el,  jsonOutput.get("loading") ? "add" : "remove", "loading" );
		c( raphaelView.el,  jsonOutput.get("loading") ? "add" : "remove", "loading" );
	}

	raphaelView.render( this.get("json") );
});

$fileInput.onchange = function( event ) {
	if ( !$fileInput.files.length ) { return; }

	svgFile.load( $fileInput.files[0] );
};

$tigerButton.onclick = function() {
	svgFile.load( "/samples/tiger.svg" );
};

function $( selector, context ) {
	return ( context || document ).querySelector( selector );
}

// c, an expressive className manipulation library
function c(e,v,n,c,r){r=e[c='className'].replace(RegExp('(^| ) *'+n+' *( |$)','g'),'');return'has'==v?r!=e[c]:e[c]={add:1,toggle:r==e[c]}[v]?r+' '+n:r};

})(window,document,Backbone,Raphael,_);