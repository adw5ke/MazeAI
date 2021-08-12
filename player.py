
# player object on the maze

class Player:

    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y

    def __str__(self):
        return str(self.location)

    @property
    def location(self):
        return self.x, self.y

    # move the player in each of the four directions; return a new player
    def up(self):
        return Player(self.x + 1, self.y)

    def down(self):
        return Player(self.x - 1, self.y)

    def left(self):
        return Player(self.x, self.y - 1)

    def right(self):
        return Player(self.x, self.y + 1)

