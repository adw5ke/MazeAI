from flask import Flask, render_template, Response, redirect, request, url_for
from maze import Maze
from q import Q
import numpy as np
import random
import json
import time


app = Flask(__name__)

mazeData = None         # maze json data from JS
roundFactor = 10        # amount of decimal places to round to



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/themes.json')
def loadThemes():
    return json.load(open('./static/styles/themes.json'))


@app.route('/elements.json')
def loadTexts():
    return json.load(open('./static/styles/elements.json'))


# get the maze data from javascript 
@app.route('/send/<string:info>', methods=['POST'])
def processInfo(info):
    global mazeData
    mazeData = json.loads(info)
    # print(mazeData)
    return "maze data successfully received"



# --------------------------------------------------------------------------------------------------- #


def difference(arr1, arr2, rnd):
    """
    - given two arrays, return the first index of the element that is different 
      between the two arrays and the difference between the two elements as a set
    - returns (-1, None) if the arrays are identical
    - determines with value changed in the q matrix
    """
    for i in range(len(arr1)):
        if arr1[i] != arr2[i]:
            return i, round(arr2[i] - arr1[i], rnd)
    return -1, None


def generateProb(itr, maxTrain, endProbability):
    """
    - reduce the probability that a move is random as the episodes increase
    - based on y = mx + b
    """
    return (endProbability / maxTrain) * itr + 0


def adjustSwitch(area):
    """
    - adjust the switch factor based on the area of the maze
    - f(x) = 0.0000037905x^2 - 0.0024922824x + 1.07099521
    """
    return (0.0000037905 * (area ** 2)) - (0.0024922824 * area) + 1.07099521


# start q learning and send the stream to JS
@app.route('/q/')
def main():
    global mazeData

    if request.headers.get('accept') == 'text/event-stream':
        def events():
            if mazeData == None:
                # return
                pass
            else:          
                rows = int(mazeData['rows'])
                cols = int(mazeData['columns'])
                data = mazeData['data']

                q = Q(rows, cols, 4)
                m = Maze(mazeData)

                maxTrain = 200                                          # amount of times we should train
                switch = maxTrain * (adjustSwitch(rows * cols) / 2)     # switch to exploit the q matrix

                prev = None                                             # previous q matrix
                curr = None                                             # current q matrix

                yield "data: start\n\n"

                for i in range(maxTrain):

                    m.reset()
                    yield "data: reset\n\n"

                    finalScore = 0
                    itr = 0

                    while not m.won():

                        itr += 1
                        # exploitation vs exploration, 50% chance we use the q matrix, 50% chance we take a random move
                        # make a random move
                        # - input i into generateProb to immediately switch to exploitation,
                        # - or input i-switch to shift probability to start at 0 after the switch
                        if random.random() > generateProb(i-switch, maxTrain, 1) or i < switch:
                            moves = m.possibleMoves()
                            random.shuffle(moves)
                            direction, location = moves[0]
                        else:
                            # take the optimal path
                            s = m.state(m.player)
                            direction = np.argmax(q.q[s])
                            location = m.moves[direction]

                        # move the player
                        yield "data: move:{}\n\n".format(direction)

                        a_t = direction
                        s_t = m.state(m.player)
                        score = m.move(location)
                        r_t = score
                        st_1 = m.state(m.player)

                        q.update(s_t, a_t, r_t, st_1)
                        q.clean(data)

                        curr = q.generate(data, roundFactor)

                        if prev != None:
                            yield "data: update:{}\n\n".format(difference(prev, curr, roundFactor))

                        prev = q.generate(data, roundFactor)

                        finalScore += score


                    # update the score and iteration display
                    yield "data: score:({}, {})\n\n".format(finalScore, itr)
                    yield "data: iter:({})\n\n".format(i+1)


                # end q learning
                yield "data: display\n\n"

                # show the best path found
                q.clean(data)
                m.reset()
                yield "data: reset\n\n"

                while not m.won():
                    time.sleep(0.5)
                    s = m.state(m.player)
                    direction = np.argmax(q.q[s])

                    yield "data: move:{}\n\n".format(direction)
                    m.move(m.moves[direction])

                time.sleep(1)

            # enable the buttons and close the stream
            yield "data: enable\n\n"
            yield "data: kill\n\n"

        return Response(events(), content_type='text/event-stream')
    return redirect(url_for('static', filename='index.html'))



if __name__ == '__main__':
    app.run(debug=True)



