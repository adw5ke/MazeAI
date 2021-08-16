document.addEventListener('DOMContentLoaded', () => {

    document.getElementById("custom").onclick = custom;                 // buttons
    document.getElementById("changeTheme").onclick = changeTheme;
    document.getElementById("start").onclick = start;
    document.getElementById("regenerate").onclick = function() {
        custom = false;
        isRunning = false;
        regenerate(custom);
        resetTime();
        document.getElementById("start").innerHTML = "start AI";
        document.getElementById("start").onclick = start;
        document.getElementById("changeTheme").disabled = false;
    };

    document.getElementById("setDefault").onclick = setDefault;         // theme dropdown menu
    document.getElementById("setBW").onclick = setBW;
    document.getElementById("setPosh").onclick = setPosh;
    document.getElementById("setSunset").onclick = setSunset;

    var sliderHeight = document.getElementById("heightSlider");         // sliders
    var sliderWidth = document.getElementById("widthSlider");
    var displaySize = document.getElementById("sizeDisplay");
    var sliderProb = document.getElementById("probSlider");
    var displayProb = document.getElementById("probDisplay");

    const boardDisplay = document.querySelector('.board');              // text display
    const scoreDisplay = document.getElementById('score');
    const resultDisplay = document.getElementById('result');

    displaySize.innerHTML = `Board Dimensions: ${sliderHeight.value} x ${sliderWidth.value}`; 
    displayProb.innerHTML = `Probability of Wall: ${sliderProb.value}`; 

    var height = 7;                   // dimensions of the board
    var width = 7;
    var probability = 0.25;           // probability that a randomly generated tile is a wall
    var custom = false;               // control if the user can create a custom maze

    var tiles = [];                   // array of tile IDs, used to control the player movement
    var qs = [];                      // array of current Q values, used to control Q value display
    var temp = 0;                     // temporary variable; used in createBoard()

    var decimalDisplay = 3;           // how many decimals should be displayed on the maze
    var themeC = 'default';           // current color theme
    var themeT = 'colors';            // current text theme
    var isRunning = false;            // suspend button and sliders while the AI is running


    // https://stackoverflow.com/questions/14484613/load-local-json-file-into-variable/18060638
    // get the color themes from the json file
    var jsonC = (function() {
        $.ajax({
            'async': false,
            'global': false,
            'url': "/themes.json",
            'dataType': "json",
            'success': function(data) {
                json = data;
            }
        });
        return json;
    })();

    // get the text themes from the json file
    var jsonT = (function() {
        $.ajax({
            'async': false,
            'global': false,
            'url': "/elements.json",
            'dataType': "json",
            'success': function(data) {
                json = data;
            }
        });
        return json;
    })();


    var colors = jsonC[themeC]['elements'];                   // main colors
    var colorsBackground = jsonC[themeC]['background'];       // color gradient
    var texts = jsonT[themeT];                                // text/innerHTMLs


    // toggle theme dropdown menu on click
    function changeTheme() {
        document.getElementById("changeThemeDropdown").classList.toggle("show");
    }

    // close dropdown menu if the user clicks outside of it
    window.onclick = function(e) {
        if (!e.target.matches('.button')) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                var option = dropdowns[i];
                if (option.classList.contains('show')) {
                    option.classList.remove('show');
                }
            }
        }
    }

    // set color themes
    // TODO: find a better way to do this
    function setDefault() {
        themeC = 'default';
        colors = jsonC[themeC]['elements'];
        colorsBackground = jsonC[themeC]['background'];
        colorTiles();
    }
    function setBW() {
        themeC = 'black_and_white';
        colors = jsonC[themeC]['elements'];
        colorsBackground = jsonC[themeC]['background'];
        colorTiles();
    }
    function setPosh() {
        themeC = 'posh';
        colors = jsonC[themeC]['elements'];
        colorsBackground = jsonC[themeC]['background'];
        colorTiles();
    }
    function setSunset() {
        themeC = 'sunset';
        colors = jsonC[themeC]['elements'];
        colorsBackground = jsonC[themeC]['background'];
        colorTiles();
    }

    // ---------------------------------------------------------------------------------------------------------- //


    // generate a different random maze, set custom to false, reset score displays, enable sliders
    function regenerate(custom) {
        tearDown();
        createBoard(probability, custom);
        scoreLog(0, 0);
        logIter(0);
        updateState('asleep');
        custom = false;
        isRunning = false;
        sliderHeight.disabled = false;
        sliderWidth.disabled = false;
        sliderProb.disabled = false;
        document.getElementById("custom").disabled = false;
        document.getElementById("changeTheme").disabled = false;
    }

    // clear the maze
    function tearDown() {
        let board = document.getElementById('mazeBoard');
        
        // remove all the current tiles
        for (let i = 0; i < (height * width); i++) {
            board.removeChild(document.getElementById(`tile${i}`));
        }

        // empty the arrays
        tiles.length = 0;
        qs.length = 0;
        isRunning = false;
    }

    // resets the player at the top of the current maze and sort tiles
    function reset() {

        let index = tiles.indexOf(document.getElementById("tile0"));

        document.getElementById('tile0').style.backgroundColor = colors['player'];
        document.getElementById('tile0').innerHTML = texts['player'];
        tiles.sort((a, b) => (parseInt((a.id).substring(4, (a.id).length)) > parseInt((b.id).substring(4, (b.id).length))) ? 1 : -1);

        document.getElementById(`tile${(height * width) - 1}`).style.backgroundColor = colors['goal'];
        document.getElementById(`tile${(height * width) - 1}`).innerHTML = texts['goal'];
        gradient();
    }

    // create tile and place it on the board
    function createTile(ID, color, innerText) {
        var tile = document.createElement('div');
        tile.classList.add('tile');
        tile.setAttribute('id', ID);
        tile.style.backgroundColor = color;
        tile.innerHTML = innerText;

        boardDisplay.appendChild(tile);
        tiles.push(tile);

        // fill qs from color
        if(color == colors['player']) qs.push(0);           // player
        else if(color == colors['wall']) qs.push(-1);       // wall
        else if(color == colors['goal']) qs.push(1);        // goal
        else if(color == colors['space']) qs.push(0);       // space
        else qs.push(-2);                                   // error
    }

    // create the playing board and randomly generate the maze; prob is the likelihood that a tile is a wall
    function createBoard(prob, custom) {
        if (!isRunning) {
            // display innerHTMLs
            if(!custom) {
                // place the player in the top cell
                createTile('tile0', colors['player'], texts['player']);

                for (let i = 1; i < (height * width) - 1; i++) {
                    if (Math.random() > prob) {
                        createTile(`tile${i}`, colors['space'], texts['space']);
                    } else {
                        createTile(`tile${i}`, colors['wall'], texts['wall']);
                    }
                    temp = i;
                }
                // place the goal tile
                createTile(`tile${++temp}`, colors['goal'], texts['goal']);
            } else {

                sliderHeight.disabled = false;
                sliderWidth.disabled = false;
                sliderProb.disabled = false;

                // don't display the innerHTMLs
                createTile('tile0', colors['player'], texts['player']);
                for (let i = 1; i < (height * width) - 1; i++) {
                    createTile(`tile${i}`, colors['space'], null);
                    temp = i;
                }
                createTile(`tile${++temp}`, colors['goal'], texts['goal']);
            }
        } else {
            // console.log('tried to reset during AI');
        }
    }

    createBoard(probability, custom);


    // https://stackoverflow.com/questions/1740700/how-to-get-hex-color-value-rather-than-rgb-value
    // convert RGB to HEX
    var hexDigits = new Array("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"); 

    //Function to convert rgb color to hex format
    function rgb2hex(rgb) {
        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    }

    function hex(x) {
        return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
    }


    // enable custom maze editor mode
    function custom() {
        tearDown();
        createBoard(0, true);
        detectHover();
        updateState('asleep');
        resetTime();
        custom = true;
        isRunning = false;
        document.getElementById("changeTheme").disabled = true;
        document.getElementById("start").innerHTML = "start AI";
        document.getElementById("start").onclick = start;
    }

    // detect hover and click on custom maze editor
    function detectHover() {
        for(let i = 1; i < (height * width)-1; i++) {
            let element = tiles[i];
            let color = rgb2hex(element.style.backgroundColor);

            // hover over
            element.onmouseover = function() {
                if(rgb2hex(element.style.backgroundColor) != colors['wall']) {
                    element.style.backgroundColor = colors['hover'];
                }
            }

            // hover off
            element.onmouseout = function() {
                element.style.backgroundColor = color;
            }

            // click and drag
            element.addEventListener('mouseover', function(e) {
                if(e.buttons == 1 || e.buttons == 3) {
                    if(rgb2hex(element.style.backgroundColor) == colors['hover'] || rgb2hex(element.style.backgroundColor) == colors['space']) {
                        element.style.backgroundColor = colors['wall'];
                        color = colors['wall'];
                    } else {
                        // // UNCOMMENT TO ENABLE REVERSE COLORING ON SECOND HOVER
                        // tiles[i].style.backgroundColor = colors['space']
                        // color = colors['space']
                    }
                }
            })

            // click only
            element.addEventListener('click', function(e) {
                if(rgb2hex(element.style.backgroundColor) == colors['hover']) {
                    element.style.backgroundColor = colors['wall'];
                    color = colors['wall'];
                } else {
                    element.style.backgroundColor = colors['space'];
                    color = colors['space'];
                }
            })
        }
    }   

    // disable hover over maze after AI has finished
    function disable() {
        for(let i = 1; i < (height * width)-1; i++) {
            let element = tiles[i];
            // hover over
            element.onmouseover = function() {
            }
            // hover off
            element.onmouseout = function() {
            }
            // click and drag
            element.addEventListener('mouseover', function(e) {
            })
            // click only
            element.addEventListener('click', function(e) {
            })
        }
    }


    // fill q array from the tile colors; used to send maze data to python
    function logFromColor() {
        qs.length = 0;
        for(let i = 0; i < (height * width); i++) {
            if (rgb2hex(tiles[i].style.backgroundColor) == colors['player']) {
                qs.push(0);
            } else if (rgb2hex(tiles[i].style.backgroundColor) == colors['space']) {
                qs.push(0);
            } else if (rgb2hex(tiles[i].style.backgroundColor) == colors['wall']) {
                qs.push(-1); 
            } else if (rgb2hex(tiles[i].style.backgroundColor) == colors['goal']) {
                qs.push(1); 
            } else {
                // console.log("unknown color")
            }
        }
    }

    // when creating a custom maze, apply the inner HTMLs values before sending the maze data
    function applyInnerHTMLs() {
        logFromColor();
        for(let i = 0; i < qs.length; i++) {
            if(qs[i] == 5) tiles[i].innerHTML = texts['player'];       // player
            else if(qs[i] == -1) tiles[i].innerHTML = texts['wall'];   // wall
            else if(qs[i] == 1) tiles[i].innerHTML = texts['goal'];    // goal
            else tiles[i].innerHTML = qs[i];                           // space
        }
    }

    // apply color gradient during q learning
    function gradient() {
        let min = Math.min(...qs);
        let max = Math.max(...qs);
        let step = (max - min) / 21;

        for(const element of tiles) {
            if (parseFloat(element.innerHTML) < min) {
                element.style.backgroundColor = colorsBackground['color1'];

            } else if (min <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 1))) {
                element.style.backgroundColor = colorsBackground['color1'];

            } else if ((min + (step * 1)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 2))) {
                element.style.backgroundColor = colorsBackground['color2'];

            } else if ((min + (step * 2)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 3))) {
                element.style.backgroundColor = colorsBackground['color3'];

            } else if ((min + (step * 3)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 4))) {
                element.style.backgroundColor = colorsBackground['color4'];

            } else if ((min + (step * 4)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 5))) {
                element.style.backgroundColor = colorsBackground['color5'];

            } else if ((min + (step * 5)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 6))) {
                element.style.backgroundColor = colorsBackground['color6'];

            } else if ((min + (step * 6)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 7))) {
                element.style.backgroundColor = colorsBackground['color7'];

            } else if ((min + (step * 7)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 8))) {
                element.style.backgroundColor = colorsBackground['color8'];

            } else if ((min + (step * 8)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 9))) {
                element.style.backgroundColor = colorsBackground['color9'];

            } else if ((min + (step * 9)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 10))) {
                element.style.backgroundColor = colorsBackground['color10'];

            } else if ((min + (step * 10)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 11))) {
                element.style.backgroundColor = colorsBackground['color11'];

            } else if ((min + (step * 11)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 12))) {
                element.style.backgroundColor = colorsBackground['color12'];

            } else if ((min + (step * 12)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 13))) {
                element.style.backgroundColor = colorsBackground['color13'];

            } else if ((min + (step * 13)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 14))) {
                element.style.backgroundColor = colorsBackground['color14'];

            } else if ((min + (step * 14)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 15))) {
                element.style.backgroundColor = colorsBackground['color15'];

            } else if ((min + (step * 15)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 16))) {
                element.style.backgroundColor = colorsBackground['color16'];

            } else if ((min + (step * 16)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 17))) {
                element.style.backgroundColor = colorsBackground['color17'];

            } else if ((min + (step * 17)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 18))) {
                element.style.backgroundColor = colorsBackground['color18'];

            } else if ((min + (step * 18)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 19))) {
                element.style.backgroundColor = colorsBackground['color19'];

            } else if ((min + (step * 19)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) < (min + (step * 20))) {
                element.style.backgroundColor = colorsBackground['color20'];

            } else if ((min + (step * 20)) <= parseFloat(element.innerHTML) && parseFloat(element.innerHTML) <= (min + (step * 21))) {
                element.style.backgroundColor = colorsBackground['color21'];

            } else if (max <= parseFloat(element.innerHTML)) {
                element.style.backgroundColor = colorsBackground['color21'];

            } else if (element.innerHTML == texts['wall']) {
                element.style.backgroundColor = colors['wall']; 

            } else if (element.innerHTML == texts['goal']) {
                element.style.backgroundColor = colors['goal']; 

            } else if (element.innerHTML == texts['player']) {
                element.style.backgroundColor = colors['player']; 

            } else {
                // console.log('unknown color: ', parseFloat(element.innerHTML))
            }
        }
    }


    // adjust maze height, width, and tile probability on slider input
    sliderHeight.oninput = function() {
        if (!isRunning) {
            displaySize.innerHTML = `Board Dimensions: ${sliderHeight.value} x ${sliderWidth.value}`; 
            tearDown();

            boardDisplay.style.height = `${this.value * 50}px`;
            height = parseInt(this.value);
            createBoard(probability, custom);

            if (custom) {
                detectHover();
            }
        } else {
            // disable slider input while the AI is running
            sliderHeight.disabled = true;
        }
    }

    sliderWidth.oninput = function() {
        if (!isRunning) {
            displaySize.innerHTML = `Board Dimensions: ${sliderHeight.value} x ${sliderWidth.value}`; 
            tearDown();

            boardDisplay.style.width = `${this.value * 50}px`;
            width = parseInt(this.value);
            createBoard(probability, custom);

            if (custom) {
                detectHover();
            }
        } else {
            sliderWidth.disabled = true;
        }
    }

    sliderProb.oninput = function() {
        if (!isRunning) {
            displayProb.innerHTML = `Probability of Wall: ${this.value}`;
            probability = this.value;

            if (!custom) {
                regenerate(custom);
            }
        } else {
            sliderProb.disabled = true;
        }
    }

    // ---------------------------------------------------------------------------------------------------------- //

    // moves the player down one space
    function playerDown() {
        // switch the player with the tile below it in 'tiles'
        let playerIndex = tiles.indexOf(document.getElementById("tile0"));
        let belowIndex = playerIndex + width;

        // off the bottom of the maze
        if(belowIndex >= height * width) {
            return;
        }

        let tile = document.getElementById(`tile${belowIndex}`);

        // check if the tile below exists and is not a wall
        if (tile && tile.innerHTML != texts['wall']) {

            // switch the positions in tiles
            let temp = tiles[playerIndex];
            tiles[playerIndex] = tiles[belowIndex];
            tiles[belowIndex] = temp;

            // change the values and recolor the tiles
            document.getElementById(`tile${playerIndex}`).innerHTML = parseFloat(qs[playerIndex]).toFixed(decimalDisplay);
            document.getElementById(`tile${belowIndex}`).innerHTML = texts['player'];
            gradient();
        } 
    }

    // moves the player up one space; see playerUp()
    function playerUp() {
        let playerIndex = tiles.indexOf(document.getElementById("tile0"));
        let aboveIndex = playerIndex - width;

        // off the top of the maze
        if(aboveIndex < 0) {
            return;
        }

        let tile = document.getElementById(`tile${aboveIndex}`);
  
        if (tile && tile.innerHTML != texts['wall']) {
            let temp = tiles[playerIndex];
            tiles[playerIndex] = tiles[aboveIndex];
            tiles[aboveIndex] = temp;

            document.getElementById(`tile${playerIndex}`).innerHTML = parseFloat(qs[playerIndex]).toFixed(decimalDisplay);
            document.getElementById(`tile${aboveIndex}`).innerHTML = texts['player'];
            gradient();
        } 
    }

    // moves the player left one space; see playerUp()
    function playerLeft() {
        let playerIndex = tiles.indexOf(document.getElementById("tile0"));
        let leftIndex = playerIndex - 1;

        // off the top left of the maze
        if(leftIndex < 0) {
            return;
        }

        let tile = document.getElementById(`tile${leftIndex}`);

        // check if the tile to the left exists, is not a wall, and is not the edge of the maze
        if (tile && tile.innerHTML != texts['wall'] && (playerIndex % width) != 0) {
            let temp = tiles[playerIndex];
            tiles[playerIndex] = tiles[leftIndex];
            tiles[leftIndex] = temp;

            document.getElementById(`tile${playerIndex}`).innerHTML = parseFloat(qs[playerIndex]).toFixed(decimalDisplay);
            document.getElementById(`tile${leftIndex}`).innerHTML = texts['player'];
            gradient();
        } 
    }

    // moves the player right one space; see playerUp()
    function playerRight() {
        let playerIndex = tiles.indexOf(document.getElementById("tile0"));
        let rightIndex = playerIndex + 1;

        // off the bottom right of the maze
        if(rightIndex >= height * width) {
            return;
        }

        let tile = document.getElementById(`tile${rightIndex}`);

        // check if the tile to the right exists, is not a wall, and is not the edge of the maze
        if (tile && tile.innerHTML != texts['wall'] && ((playerIndex + 1) % width) != 0) {
            let temp = tiles[playerIndex];
            tiles[playerIndex] = tiles[rightIndex];
            tiles[rightIndex] = temp;

            // change the values and recolor the tiles
            document.getElementById(`tile${playerIndex}`).innerHTML = parseFloat(qs[playerIndex]).toFixed(decimalDisplay);
            document.getElementById(`tile${rightIndex}`).innerHTML = texts['player'];
            gradient();
        } 
    }


    // assign keycodes; mainly for testing
    function control(e) {
        if (e.keyCode === 39) {
            playerRight();
        } else if (e.keyCode === 37) {
            playerLeft();
        } else if (e.keyCode === 38) {
            playerUp();
        } else if (e.keyCode === 40) {
            playerDown();
        } else if (e.keyCode === 32) {
            
        }
    }

    document.addEventListener('keyup', control);


    function sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    // given the index of the tile and the q score, update its value in the maze
    function update(index, score) {  
        // update the value in Qs and change the value on the maze; if index is -1, no update is needed
        if (index != -1) {
            qs[index] += score;
        }
    }

    // update the score display
    function scoreLog(score, iterations) {
        score = parseFloat(score).toFixed(decimalDisplay);
        document.getElementById("score").innerHTML = `${score}`;
        document.getElementById("iterations").innerHTML = `${iterations}`;
    }

    // update the iteration display
    function logIter(i) {
        document.getElementById("episodes").innerHTML = i;
    }

    // update the state
    function updateState(state) {
        document.getElementById("state").innerHTML = state;
    }

    // enable the buttons after AI has finished
    function enable() {
        document.getElementById("regenerate").disabled = false;
        document.getElementById("custom").disabled = false;
        document.getElementById("changeTheme").disabled = false;
    }

    // flash colors 3 times when AI finished 
    async function flash() {
        let temp = [];
        // keep track of the current colors
        for(const element of tiles) {
            temp.push(element.style.backgroundColor);
        }
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < tiles.length; j++) {
                if(qs[j] != -1) {
                    tiles[j].style.backgroundColor = colors['flash1'];
                } else {
                    tiles[j].style.backgroundColor = colors['flash2'];
                }
            } 
            await sleep(500);
            for(let k = 0; k < tiles.length; k++) {
                tiles[k].style.backgroundColor = temp[k];
            }
            await sleep(500);
        }
    }


    // https://stackoverflow.com/questions/26329900/how-do-i-display-millisecond-in-my-stopwatch
    // implement timer
    var timeBegan = null;
    var timeStopped = null;
    var stoppedDuration = 0;
    var started = null;

    function startTime() {
        if (timeBegan === null) {
            timeBegan = new Date();
        }

        if (timeStopped !== null) {
            stoppedDuration += (new Date() - timeStopped);
        }

        started = setInterval(clockRunning, 10);    
    }

    function stopTime() {
        timeStopped = new Date();
        clearInterval(started);
    }
     
    function resetTime() {
        clearInterval(started);
        stoppedDuration = 0;
        timeBegan = null;
        timeStopped = null;
        document.getElementById("timer").innerHTML = "00:00.000";
    }

    function clockRunning(){
        var currentTime = new Date()
            , timeElapsed = new Date(currentTime - timeBegan - stoppedDuration)
            , hour = timeElapsed.getUTCHours()
            , min = timeElapsed.getUTCMinutes()
            , sec = timeElapsed.getUTCSeconds()
            , ms = timeElapsed.getUTCMilliseconds();

        document.getElementById("timer").innerHTML = 
            // (hour > 9 ? hour : "0" + hour) + ":" + 
            (min > 9 ? min : "0" + min) + ":" + 
            (sec > 9 ? sec : "0" + sec) + "." + 
            (ms > 99 ? ms : ms > 9 ? "0" + ms : "00" + ms);
    };

    // stop AI during learning
    function suspend(source) {
        document.getElementById("start").onclick = function() {
            source.close();
            if(isRunning) {
                updateState("killed");
            }
            enable();
            stopTime();
        }
    }


    // ---------------------------------------------------------------------------------------------------------- //

    // send the maze data to python for q learning
    async function start() {
        startTime();
        updateState("learning");

        // only start if not currently running the AI
        if(!isRunning) {
            isRunning = true;

            // disable all buttons
            document.getElementById("regenerate").disabled = true;
            document.getElementById("custom").disabled = true;
            document.getElementById("changeTheme").disabled = true;
            document.getElementById("start").innerHTML = "suspend AI";

            logFromColor();
            applyInnerHTMLs();

            // format maze data as JSON
            let maze = {
                'rows' : height,
                'columns' : width,
                'data' : qs
            };

            // send the data to python
            const request = new XMLHttpRequest();
            request.open('POST', `/send/${JSON.stringify(maze)}`)
            request.onload = () => {
                const flaskMessage = request.responseText;
                // console.log(flaskMessage)
            }
            request.send();

            // call stream
            stream();
        }
    }

    // get data from q learning
    function stream() {

        if (!!window.EventSource) {
            var source = new EventSource('/q/');

            // ENABLE USER TO STOP AI WHILE IT'S RUNNING
            suspend(source);
            source.onmessage = function(e) {

                $("#data").text(e.data);
            
                // disable hover
                if (e.data.includes('start')) {
                    disable();

                // reset the player
                } else if (e.data.includes('reset')) {
                    reset();

                // move the player
                } else if (e.data.includes('move')) {

                    let a = e.data.indexOf(':');
                    let move = parseInt(e.data.substring(a+1, a+2));

                    if (move == 0) playerDown();
                    else if (move == 1) playerUp();
                    else if (move == 2) playerLeft();
                    else if (move == 3) playerRight();

                // update a tile's score
                } else if (e.data.includes('update')) {
                    let a = e.data.indexOf('(');
                    let b = e.data.indexOf(',');
                    let c = e.data.indexOf(')');

                    let x = parseInt(e.data.substring(a+1, b));
                    let y = parseFloat(e.data.substring(b+2, c));
                    update(x, y);

                // update the final score and number of iterations in the score display
                } else if (e.data.includes('score')) {
                    let a = e.data.indexOf('(');
                    let b = e.data.indexOf(',');
                    let c = e.data.indexOf(')');

                    finalScore = e.data.substring(a+1, b);
                    iterations = e.data.substring(b+2, c);
                    scoreLog(finalScore, iterations);

                // update the iteration display
                } else if (e.data.includes('iter')) {
                    let a = e.data.indexOf('(');
                    let b = e.data.indexOf(')');

                    logIter(e.data.substring(a+1, b));

                // q learning finished
                } else if (e.data.includes('display')) {
                    stopTime();
                    updateState('solving');

                // enable the buttons    
                } else if (e.data.includes('enable')) {
                    enable();
                }

                // end the event source
                if (e.data == 'kill') {
                    source.close();
                    flash();
                    updateState('finished');
                    document.getElementById("start").innerHTML = "start AI";
                    isRunning = false;
                }
                // source.close();
            }
        }
    }


    // add colors
    function colorTiles() {
        for (let i = 0; i < tiles.length; i++) {
            if (tiles[i].innerHTML == texts['player']) tiles[i].style.backgroundColor = colors['player'];         // player
            else if (tiles[i].innerHTML >= 0) tiles[i].style.backgroundColor = colors['space'];                   // background + 
            else if (tiles[i].innerHTML < 0) tiles[i].style.backgroundColor = colors['space'];                    // background - 
            else if (tiles[i].innerHTML == texts['goal']) tiles[i].style.backgroundColor = colors['goal'];        // goal
            else if (tiles[i].innerHTML == texts['wall']) tiles[i].style.backgroundColor = colors['wall'];        // wall
            else if (tiles[i].innerHTML == 'x') tiles[i].style.backgroundColor = colors['hover'];                 // hover (unused)
        }
    }
})


