
//the canvas used to draw the state of the game
var ctx;

//config object used to set the parameters of the game. This object is passed to the worker thread to initialize it
var config = new Object();
config.grid_size = 20;
config.number_obstacles = 5;
config.square_size = 13;
config.snake_length = 5;
config.search = 'BFS';
config.runTimeout = 0;

function init(){
	ctx = document.getElementById('canvas').getContext("2d");
	
	//tell the worker to set itself up
	var message = new Object();
	message.do = 'init';
	message.config = config;
	worker.postMessage(message);
	change_search();
}

//Redraw the screen based on the state of the game, which is passed from the worker
function refresh_view(data){
	//stop when we reach 100, this is so we have consistent sample sizes
	if(data.stats.food >= 100)
		stop();
	//output some stats about our performance
	document.getElementById('moves_val').innerHTML = data.stats.moves;
	document.getElementById('food_val').innerHTML = data.stats.food;
	document.getElementById('avg_moves_val').innerHTML = data.stats.moves/(data.stats.food);
	document.getElementById('avg_nodes_val').innerHTML = data.stats.count/(data.stats.food);
	//draw the squares, color based on what type of square
	for(var i=0;i<config.grid_size;i++){
		for(var j=0;j<config.grid_size;j++){
			switch(data.squares[i][j]){
			case 0:
				//empty
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.rect(i*config.square_size, j*config.square_size, config.square_size-1, config.square_size-1);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.rect(i*config.square_size, j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fillStyle = "#000";
				ctx.stroke();
				break;
			case 1:
				//path
				ctx.fillStyle = "#C3D9FF";
				ctx.beginPath();
				ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fill();
				break;
			case 3:
				//wall
				ctx.fillStyle = "#999";
				ctx.beginPath();
				ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fill();
				break;
			case 2:
				//food
				ctx.fillStyle = "#c33";
				ctx.beginPath();
				ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fill();
				break;
			case 4:
				//obstacle
				ctx.fillStyle = "#804000";
				ctx.beginPath();
				ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fill();
				break;
			default:
				if(data.squares[i][j] == 5){
					//head
					ctx.fillStyle = "#00FF00";
					ctx.beginPath();
					ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
					ctx.closePath();
					ctx.fill();
					break;
				}
				if(data.squares[i][j] == 4+config.snake_length){
					//tail
					ctx.fillStyle = "#0000A0";
					ctx.beginPath();
					ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
					ctx.closePath();
					ctx.fill();
					break;
				}
				//body
				ctx.fillStyle = "#800080";
				ctx.beginPath();
				ctx.rect(i*config.square_size,j*config.square_size, config.square_size, config.square_size);
				ctx.closePath();
				ctx.fill();
				break;				
			}
		}
	}
}

//create a web worker that will do the processing
var worker = new Worker("snake-worker.js");

//when the worker sends a message, act on it.
worker.onmessage = function(event) {
	//if it's a move, then redraw the screen based on the state passed
	if(event.data.type == 'move')
		refresh_view(event.data);
	else
		console.log(event.data);
	//otherwise, it's an error, send it to the console so we can see it in firebug
};

//if the worker reports an error, log it in firebug
worker.onerror = function(error) {  
	console.log(error.message);
};  

//sends a start message to the worker. The worker will begin processing until it's told to stop.
function start(){
	var message = new Object();
	message.do = 'start';
	worker.postMessage(message);
}

//stop the worker. It will be 'paused' and wait until it's told to start again. State will be maintained
function stop(){
	var message = new Object();
	message.do = 'stop';
	worker.postMessage(message);
}

//update the type of search we want the worker to use.
function change_search(){
	var message = new Object();
	message.do = 'set_search';
	message.search = document.getElementById('search').value;
	worker.postMessage(message);
}