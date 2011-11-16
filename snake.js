/**
This is the worker. It is used by a1.html to perform all the CPU-intensive
processing, so the GUI will remain responsive. This worker maintains the state
of the grid, position of the elements on the grid, and performs the computations
that are used to find the path that will be taken by the snake, and carries out the
movement of the snake.

The worker is initialized and given instructions by a1.html.
The worker sends the state information back to a1.html to be drawn on the screen
  so the user can see what the current state is.
**/

//Point class, used to refer to a specific square on the grid
function Point(pos_x,pos_y){
	this.x = pos_x;
	this.y = pos_y;
}
//Node class, used by searches as nodes in a tree.
function Node(parent,point,children,g_score,h_score){
	this.parent = parent;
	this.point = point;
	this.children = children;
	this.g_score = g_score;
	this.h_score = h_score;
	this.f_score = g_score + h_score;
}

//some local variables used by the worker to track it's state.
var config = new Object();
var stats = new Object();
stats.moves = 0;
stats.food = 0;
stats.count = 0;
var squares;
var snake;
var food;
var moves = new Array();


//initialize the state of the grid.
function init(){
	squares = new Array(config.grid_size);
	for(var i=0;i<config.grid_size;i++){
		squares[i] = new Array(config.grid_size);
	}
	//initialize square values, set walls
	for(var i=0;i<config.grid_size;i++){
		for(var j=0;j<config.grid_size;j++){
			if(i == 0 || j == 0 || i == config.grid_size-1 || j == config.grid_size-1){
				squares[i][j] = 3;
			}else{
				squares[i][j] = 0;
			}
		}
	}
	
	//place the snake, obstacles, and food.
	snake = place_snake(config.snake_length);
	place_obstacles(config.number_obstacles);
	place_food();
	refresh_view();
}

//this is the function that is called whenever the worker receives a message.
//based on the content of the message (event.data.do), do the appropriate action.
onmessage = function(event) {
	switch(event.data.do){
		case 'start':
			start();
			break;
		case 'stop':
			stop();
			break;
		case 'init':
			config = event.data.config;
			init();
			break;
		case 'set_search':
			config.search = event.data.search;
			break;
	}
}

//This function runs repeatedly. Checks if we should move, or search for more moves, and carries out the moves.
function run(){
	//stop at 100 food, for statistical purposes:
	if(stats.food >= 100){
		clearTimeout(config.runTimeout);
		return;
	}
	//moves is a list of moves that the snake is to carry out. IF there are no moves left, then run a search to find more.
	if(moves.length == 0){
		//no moves left, so search for more based on the current search selected.
		switch(config.search){
			case 'BFS':
				findpath_bfs();
				break;
			case 'DFS':
				findpath_dfs();
				break;
			case 'A* - H1':
				findpath_a("H1");
				break;
			case 'A* - H2':
				findpath_a("H2");
				break;
			case 'A* - (H1+H2)/2':
				findpath_a("H1+H2");
				break;
		}
	}else{
		//we still have moves left, so move the snake to the next square.
		move(moves.shift());
	}
	//send the new state to the browser
	refresh_view();
	//wait and then continue with the next move.
	clearTimeout(config.runTimeout);
	config.runTimeout = setTimeout(run, 100);//need to wait a bit, otherwise CPU get overloaded and browser becomes unresponsive.
}

//Breadth First Search
function findpath_bfs(){
	postMessage("running BFS");
	// Creating our Open and Closed Lists
	var openList = new Array();
	var closedList = new Array(config.grid_size);
	for(var i=0;i<config.grid_size;i++){
		closedList[i] = new Array(config.grid_size);
	}
	//initialize closedList values to 0
	for(var i=0;i<config.grid_size;i++){
		for(var j=0;j<config.grid_size;j++){
			closedList[i][j] = 0;
		}
	}
	
	
	// Adding our starting point to Open List
	openList.push(new Node(null,snake[0],new Array()));
	// Loop while openList contains some data.
	while (openList.length != 0) {
		var n = openList.shift();
		if(closedList[n.point.x][n.point.y] == 1)
			continue;
		stats.count++;
		// Check if node is food
		if (squares[n.point.x][n.point.y] == 2) {
			//if we have reached food, climb up the tree until the root to obtain path
			do{
				moves.unshift(n.point);
				if(squares[n.point.x][n.point.y] == 0)
					squares[n.point.x][n.point.y] = 1;
				n = n.parent;
			}while(n.parent != null)
			break;
		}
		// Add current node to closedList
		closedList[n.point.x][n.point.y] = 1;
		
		// Add adjacent nodes to openlist to be processed.
		if(closedList[n.point.x][n.point.y-1] == 0 && (squares[n.point.x][n.point.y-1] == 0 || squares[n.point.x][n.point.y-1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y-1),new Array()));
		if(closedList[n.point.x+1][n.point.y] == 0 && (squares[n.point.x+1][n.point.y] == 0 || squares[n.point.x+1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x+1,n.point.y),new Array()));
		if(closedList[n.point.x][n.point.y+1] == 0 && (squares[n.point.x][n.point.y+1] == 0 || squares[n.point.x][n.point.y+1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y+1),new Array()));
		if(closedList[n.point.x-1][n.point.y] == 0 && (squares[n.point.x-1][n.point.y] == 0 || squares[n.point.x-1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x-1,n.point.y),new Array()));
		for(var i=0;i<n.children.length;i++){
			openList.push(n.children[i]);
		}
	}
}

//Depth First Search
function findpath_dfs(){
	postMessage("running DFS");
	// Creating our Open and Closed Lists
	var openList = new Array();
	var closedList = new Array(config.grid_size);
	for(var i=0;i<config.grid_size;i++){
		closedList[i] = new Array(config.grid_size);
	}
	//initialize closedList values to 0
	for(var i=0;i<config.grid_size;i++){
		for(var j=0;j<config.grid_size;j++){
			closedList[i][j] = 0;
		}
	}
	
	
	// Adding our starting point to Open List
	openList.push(new Node(null,snake[0],new Array()));
	// Loop while openList contains some data.
	while (openList.length != 0) {
		var n = openList.shift();
		if(closedList[n.point.x][n.point.y] == 1)
			continue;
		stats.count++;
		// Check if node is food
		if (squares[n.point.x][n.point.y] == 2) {
			//if we have reached food, climb up the tree until the root to obtain path
			do{
				moves.unshift(n.point);
				if(squares[n.point.x][n.point.y] == 0)
					squares[n.point.x][n.point.y] = 1;
				n = n.parent;
			}while(n.parent != null)
			break;
		}
		// Add current node to closedList
		closedList[n.point.x][n.point.y] = 1;
		
		
		// Add adjacent nodes to openlist to be processed.
		if(closedList[n.point.x][n.point.y-1] == 0 && (squares[n.point.x][n.point.y-1] == 0 || squares[n.point.x][n.point.y-1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y-1),new Array()));
		if(closedList[n.point.x+1][n.point.y] == 0 && (squares[n.point.x+1][n.point.y] == 0 || squares[n.point.x+1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x+1,n.point.y),new Array()));
		if(closedList[n.point.x][n.point.y+1] == 0 && (squares[n.point.x][n.point.y+1] == 0 || squares[n.point.x][n.point.y+1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y+1),new Array()));
		if(closedList[n.point.x-1][n.point.y] == 0 && (squares[n.point.x-1][n.point.y] == 0 || squares[n.point.x-1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x-1,n.point.y),new Array()));
		for(var i=0;i<n.children.length;i++){
			openList.unshift(n.children[i]);
		}
	}
}

//A* search, based on selected heuristic
function findpath_a(search_type){
	postMessage("running " + search_type);
	// Creating our Open and Closed Lists
	var openList = new Array();
	var closedList = new Array(config.grid_size);
	for(var i=0;i<config.grid_size;i++){
		closedList[i] = new Array(config.grid_size);
	}
	//initialize closedList values to 0
	for(var i=0;i<config.grid_size;i++){
		for(var j=0;j<config.grid_size;j++){
			closedList[i][j] = 0;
		}
	}
	
	// Adding our starting point to Open List
	openList.push(new Node(null,snake[0],new Array(),0,heuristic_estimate(snake[0],food,search_type)));
	// Loop while openList contains some data.
	while (openList.length != 0) {
		//pick the node in openset that has the lowest f_score
		openList.sort(function(a,b){return a.f_score - b.f_score})
		var n = openList.shift();
		
		if(closedList[n.point.x][n.point.y] == 1)
			continue;
		stats.count++;
		// Check if node is food
		if (squares[n.point.x][n.point.y] == 2) {
			//if we have reached food, climb up the tree until the root to obtain path
			do{
				moves.unshift(n.point);
				if(squares[n.point.x][n.point.y] == 0)
					squares[n.point.x][n.point.y] = 1;
				n = n.parent;
			}while(n.parent != null)
			break;
		}
		// Add current node to closedList
		closedList[n.point.x][n.point.y] = 1;
		
		// Add adjacent nodes to openlist to be processed.
		if(closedList[n.point.x][n.point.y-1] == 0 && (squares[n.point.x][n.point.y-1] == 0 || squares[n.point.x][n.point.y-1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y-1),new Array(),n.g_score+1,heuristic_estimate(new Point(n.point.x,n.point.y-1),food,search_type)));
		if(closedList[n.point.x+1][n.point.y] == 0 && (squares[n.point.x+1][n.point.y] == 0 || squares[n.point.x+1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x+1,n.point.y),new Array(),n.g_score+1,heuristic_estimate(new Point(n.point.x+1,n.point.y),food,search_type)));
		if(closedList[n.point.x][n.point.y+1] == 0 && (squares[n.point.x][n.point.y+1] == 0 || squares[n.point.x][n.point.y+1] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x,n.point.y+1),new Array(),n.g_score+1,heuristic_estimate(new Point(n.point.x,n.point.y+1),food,search_type)));
		if(closedList[n.point.x-1][n.point.y] == 0 && (squares[n.point.x-1][n.point.y] == 0 || squares[n.point.x-1][n.point.y] == 2))
			n.children.unshift(new Node(n,new Point(n.point.x-1,n.point.y),new Array(),n.g_score+1,heuristic_estimate(new Point(n.point.x-1,n.point.y),food,search_type)));
		for(var i=0;i<n.children.length;i++){
			var index = in_openlist(openList,n.children[i]);
			if(index < 0){
				//node not in openList, add it.
				openList.push(n.children[i]);
			}else{
				//found a node in openlist that we already found earlier. Check if this is a better route
				if(n.children[i].f_score < openList[index].f_score){
					//better route, use this one instead.
					//set the new parent for all the old child nodes
					for(var j=0;j<openList[index].children.length;j++){
						openList[index].children[j].parent = n.children[i];
					}
					//give the children to the new parent
					n.children[i].children = openList[index].children;
					//remove the old node from openList
					openList.splice(index,1);
					//add new node to openList
					openList.push(n.children[i]);
					//Update the scores for all child nodes.
					update_scores(n.children[i]);
				}
			}
		}
	}
}

//updates scores of child nodes
function update_scores(parent){
	for(var i=0;i<parent.children.length;i++){
		parent.children[i].g_score = parent.g_score+1;
		parent.children[i].h_score = heuristic_estimate(parent.children[i].point);
		parent.children[i].f_score = parent.children[i].g_score + parent.children[i].h_score;
		//recursively update any child nodes that this child might have.
		update_scores(parent.children[i]);
	}
}

//check is aNode is in openList. If a match is found, return index, -1 if no match
function in_openlist(openList,aNode){
	for(var i=0;i<openList.length;i++){
		if(openList[i].point.x == aNode.point.x && openList[i].point.y == aNode.point.y)
			return i;
	}
	return -1;
}

//heuristic_estimate interface, used to keep the calls in findpath_a() simple. Check the search_type,  and call the appropriate helper function.
function heuristic_estimate(point1, point2,search_type){
	switch(search_type){
		case "H1":
			return heuristic_estimate_1(point1,point2);
		case "H2":
			return heuristic_estimate_2(point1,point2);
		case "H1+H2":
			return (heuristic_estimate_1(point1,point2) + heuristic_estimate_2(point1,point2))/2;
	}
}

//First heuristic: calculate the direct path to the food. This will usually be less than actual, because it's a slant distance.
function heuristic_estimate_1(point1,point2){
	return Math.sqrt(Math.pow(point1.x-point2.x,2) + Math.pow(point1.y-point2.y,2));
}
//Second heuristic: calculate the actual distance that the snake would have to travel to reach the food.
function heuristic_estimate_2(point1,point2){
	return Math.abs(point1.x-point2.x)+Math.abs(point1.y-point2.y);
}

//start the run function
function start(){
	init();
	config.runTimeout = setTimeout(run, 100);
	stats.moves = 0;
	stats.food = 0;
	stats.count = 0;
}

//stop the run function
function stop(){
	clearTimeout(config.runTimeout);
}

//send the current state information to the browser to redraw the latest state.
function refresh_view(){
	var message = new Object();
	message.type = 'move';
	message.squares = squares;
	message.stats = stats;
	postMessage(message);
}

//move the snake to the new Point given
function move(new_head){
	//check that this is a legal move. Square must be adjacent and empty (can move to empty, food or path.
	if((!is_adjacent(new_head,snake[0])) || squares[new_head.x][new_head.y] > 2){
		return false;
	}
	//if we are at a food square, put a new food on the grid, and keep stats.
	if(squares[new_head.x][new_head.y] == 2){
		place_food();
		stats.food++
	}
	
	//clear the tail
	squares[snake[snake.length-1].x][snake[snake.length-1].y] = 0;
	
	//move the snake forward
	for(var i=snake.length-1;i>0;i--){
		snake[i].x = snake[i-1].x;
		snake[i].y = snake[i-1].y;
	}
	snake[0].x = new_head.x;
	snake[0].y = new_head.y;
	
	//update squares with new snake information for redrawing
	for(var i=0;i<snake.length;i++){
		squares[snake[i].x][snake[i].y] = 5+i;
	}
	//keep stats
	stats.moves++;
	return true;
}

//helper function checks if two points are adjacent. Used to check if moves are legal.
function is_adjacent(point1, point2){
	if(point1.x == point2.x && (point1.y == point2.y-1 || point1.y == point2.y+1))
		return true;
	if(point1.y == point2.y && (point1.x == point2.x-1 || point1.x == point2.x+1))
		return true;
	return false;
}

//place the snake on the grid. 
function place_snake(length){
	var middle_x = Math.floor(config.grid_size/2);
	var middle_y = Math.floor(config.grid_size/2);
	var snake = new Array(length);
	while(length){
		squares[middle_x+length][middle_y] = 4+length;
		snake[length-1] = new Point(middle_x+length,middle_y);
		length--;
	}
	return snake;
}

//randomly place obstacles on the grid.
function place_obstacles(count){
	for(var c=0;c<count;){
		var random_x = Math.floor(Math.random()*(config.grid_size-2))+1;
		var random_y = Math.floor(Math.random()*(config.grid_size-2))+1;
		if(squares[random_x][random_y] == 0){
			squares[random_x][random_y] = 4;
			c++;
		}
	}
}

//randomly place a food pellet on the grid.
function place_food(){
	do{
		var random_x = Math.floor(Math.random()*(config.grid_size-2))+1;
		var random_y = Math.floor(Math.random()*(config.grid_size-2))+1;
	}while(squares[random_x][random_y] != 0);
	squares[random_x][random_y] = 2;
	food = new Point(random_x,random_y);
}