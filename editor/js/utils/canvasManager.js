/* Mini canvas wrapper for some lightgl common actions
	- organizes different modules accesing the 3d context (input and rendering)
	- some debug utilities
	- super and subsampling

	Dependencies: 
		litegl
		Shaders
*/

function CanvasManager( container, options)
{
	this.modules = [];
	this.keys = {};

	this.init( container, options )
}

CanvasManager.prototype.init = function( options )
{
	options = options || {};

	var container = options.container || "body";

	if(container.constructor === String)
	{
		container = document.querySelector( container );
		if(!container)
			return false;
	}

	if( options.full )
	{
		options.width = container.offsetWidth; //$(container).width();
		options.height = container.offsetHeight;// $(container).height();
	}

	options.width = options.width || 500;
	options.height = options.height || 500;

	var antialiasing = true;
	if(options.antialiasing != null)
		antialiasing = options.antialiasing;

	//setting this var to true will make the render slower but allow to call toDataURL
	var allow_read = false;

	//create canvas and attach events
	try
	{
		window.gl = GL.create({ antialias: antialiasing, alpha:false, premultipliedAlpha: false, debug: true, preserveDrawingBuffer: allow_read });
	}
	catch (err)
	{
		console.error("WebGL not supported");
		return false;
	}

	if(options.subsampling && options.subsampling != 1 )
	{
		gl.canvas.width = options.width / options.subsampling;
		gl.canvas.height = options.height / options.subsampling;
		gl.canvas.style.width = options.width.toFixed() + "px";
		gl.canvas.style.height = options.height.toFixed() + "px";
	}
	else
	{
		gl.canvas.width = options.width;
		gl.canvas.height = options.height;
	}

	var that = this;

	gl.ondraw = this.ondraw.bind(this);
	gl.onupdate = this.onupdate.bind(this);

	gl.captureMouse(true);
	gl.captureKeys();

	gl.onmousedown = gl.onmousemove = gl.onmouseup = gl.onkeydown = gl.onkeyup = gl.onmousewheel = this.dispatchEvent.bind(this);

	gl.viewport(0,0,gl.canvas.width, gl.canvas.height);
	gl.enable( gl.CULL_FACE );
	gl.enable( gl.DEPTH_TEST );

	//attach
	container.appendChild( gl.canvas );

	//window.addEventListener("resize", this.onCheckSize.bind(this), true ); //dont work :(
	$(window).resize( this.onCheckSize.bind(this) );

	//this.timer = setInterval( this.onCheckSize.bind(this), 100 );
	this.canvas = gl.canvas;
	this.gl = gl;
	gl.animate();
};

CanvasManager.prototype.onCheckSize = function()
{
	//console.log("resize!");
	this.resize();
}

CanvasManager.prototype.resize = function(w,h)
{
	if(!this.gl || !this.gl.canvas)
		return;

	var parent = this.gl.canvas.parentNode;
	w = w || $(parent).width();
	h = h || $(parent).height();

	if(w == 0 || h == 0) return;
	if(w == this.gl.canvas.width && h == this.gl.canvas.height)
		return;

	this.gl.canvas.width = w;
	this.gl.canvas.height = h;
	this.gl.viewport(0,0,w,h);
}

CanvasManager.prototype.enable = function()
{
	window.gl = this.gl;
}

CanvasManager.prototype.addModule = function(module, index)
{
	if(index === undefined)
		this.modules.push(module);
	else
		this.modules.splice(index,0,module);
},

CanvasManager.prototype.removeModule = function(module)
{
	var pos = this.modules.indexOf(module);
	if(pos != -1)
		this.modules.splice(pos,1);
},

//Be careful, events are processed from end to start, so lower order means later
CanvasManager.prototype.setModuleOrder = function(module, order)
{
	var pos = this.modules.indexOf(module);
	if(pos == order) return;

	this.modules.splice(pos,1); //remove
	if(order < 0)
		this.modules.splice(0,0,module);
	else if(order >= this.modules.length)
		this.modules.push(module);
	else
		this.modules.splice(order,0,module);
},


CanvasManager.prototype.ondraw = function()
{
	for(var i = 0; i < this.modules.length; ++i)
	{
		if(this.modules[i].render)
			if(this.modules[i].render() == true)
				break;
	}
},

CanvasManager.prototype.onupdate = function(seconds)
{
	for(var i = 0; i < this.modules.length; ++i)
	{
		if(this.modules[i].update)
			this.modules[i].update(seconds);
	}
}

//input ******************

CanvasManager.prototype.dispatchEvent = function(e)
{
	var event_name = e.eventType;
	//trace(event_name);
	if(event_name == "mousedown")
	{
		LiteGUI.focus_widget = this.canvas;
		var elem = document.activeElement;
		if(elem && elem.blur)
			elem.blur();
	}

	/*
	if(event_name == "keydown")
	{
		if(	LiteGUI.focus_widget )
			LiteGUI.focus_widget.dispatchEvent( e );
		if(e.defaultPrevented)
			return;
	}
	*/

	for(var i = this.modules.length-1;i >= 0; i--)
	{
		if(this.modules[i]["onevent"])
			if(this.modules[i]["onevent"].call(this.modules[i],e) === true)
				break;

		if(this.modules[i][event_name])
			if(this.modules[i][event_name].call(this.modules[i],e) === true)
				break;
	}
}
