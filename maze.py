from player import Player
from q import Q
import numpy as np
import random
import time



class Maze:

    def __init__(self, data):
        """
        initialize the maze from json data
        """
        rows = int(data['rows'])
        cols = int(data['columns'])
        self.board = np.zeros((rows, cols))
        self.rows = rows
        self.cols = cols
        self.player = Player()

        itr = 0
        # convert array of innerHTMLs to 2d array
        for i in range(rows):
            for j in range(cols):
                self.board[i][j] = int(data['data'][itr])
                itr += 1


    def __str__(self):
        string = ''
        for i in range(self.rows):
            for j in range(self.cols):
                string += str(self.board[i][j]) + ' '
            string += '\n'
        return string


    @property
    def moves(self):
        """
        return references to the new player objects
        """
        return [self.player.up(), self.player.down(), self.player.left(), self.player.right()]


    def reset(self):
        """
        reset the player at the top of the board
        """
        self.player.x = 0
        self.player.y = 0


    def state(self, player):
        """
        convert the player's position to a state
        """
        return player.x * self.cols + player.y


    def valid(self, player):
        """
        player is valid if it is in bounds and takes a valid move
        """
        return 0 <= player.x < self.rows and 0 <= player.y < self.cols and self.board[player.x, player.y] != -1


    def possibleMoves(self):
        """
        - return all possible moves for the current player
        - Down -> 0, Up -> 1, Left -> 2, Right -> 3
        """
        return [(index, player) for index, player in enumerate(self.moves) if self.valid(player)]


    def move(self, player):
        """
        calculate the score for a move
        """
        assert self.valid(player), "Invalid move"
        self.player = player
        return 10 if self.won() else -0.1


    def won(self):
        """
        check to see if the player has reached the goal tile
        """
        return self.board[self.player.x, self.player.y] == 1

 