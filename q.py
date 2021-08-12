import numpy as np

# Q matrix

class Q:

    def __init__(self, rows, cols, numActions, learningRate=0.1, discountFactor=1.0):
        numStates = rows * cols
        self.q = np.zeros((numStates, numActions))
        self.rows = rows
        self.cols = cols
        self.alpha = learningRate
        self.gamma = discountFactor


    def update(self, s_t, a_t, r_t, s_t1):
        """
        - update the q matrix
        """
        q = self.q
        a = self.alpha
        g = self.gamma

        # q learning equation; see https://en.wikipedia.org/wiki/Q-learning
        # q[s_t, a_t] is the new value, alpha is the learning rate
        # r_t is the reward, gamma is the discount factor
        q[s_t, a_t] = (1 - a) * q[s_t, a_t] + a * (r_t + g * np.max(q[s_t1]))


    def clean(self, walls):
        """
        - remove any values from the q matrix that were resultant from an invalid move
          an invalid move is a move going out of bounds or a move into a wall
        - **this step should be handled by the maze; this is just an added level of insurance**
        Down -> 0, Up -> 1, Left -> 2, Right -> 3
        """
        # up/down
        for i in range(self.cols):
            self.q[self.cols*self.rows-1-i][0] = 0    # down
            self.q[i][1] = 0                          # up
        # left/right
        for i in range(self.rows):
            self.q[i*self.cols][2] = 0                # left
            self.q[i*self.cols+(self.cols-1)][3] = 0  # right

        # all wall tiles should not have values
        for i in range(len(walls)):
            if walls[i] == '-1':
                self.q[i] = np.full((1,4), 0.0)[0]


    def generate(self, data, rnd):
        """
        - given the q matrix, generate a matrix of size 'rows' x 'cols' that is the result of
          combining the score for each possible move to each square to display onto the maze
        - returns result as a 1d array
        """
        temp = np.full((self.rows, self.cols), 0.0)
        iter = 0
        for i in range(self.rows):
            for j in range(self.cols):
                # down: shift cells down; do not add scores into the top row
                if iter-self.cols >= 0:
                    temp[i][j] += self.q[iter-self.cols][0]

                # up: shift cell up; do not add scores into the bottom row
                if iter+self.cols < self.rows*self.cols:
                    temp[i][j] += self.q[iter+self.cols][1]

                # left: shift cells left; do not add scores into the rightmost column
                if iter < self.rows * self.cols and (iter+self.cols+1) % self.cols != 0:
                    temp[i][j] += self.q[iter+1][2]

                # right: shift cells right; do not add scores into the leftmost column
                if iter > 0 and iter % self.cols != 0:
                    temp[i][j] += self.q[iter-1][3]

                iter += 1

        # convert the 2d matrix result to a 1d array
        result = []
        iter = 0
        for i in range(self.rows):
            for j in range(self.cols):
                # exclude wall tiles
                if data[iter] == '-1':
                    result.append(0.0)
                else:
                    result.append(round(temp[i][j], rnd))
                iter += 1

        return result



