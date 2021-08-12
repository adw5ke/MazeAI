# MazeAI

Maze AI is a program that aims to find the best possible path through a maze to reach the goal using reinforcement learning, or [Q learning](https://towardsdatascience.com/simple-reinforcement-learning-q-learning-fcddc4b6fe56).

The AI uses Q learning to find the best possible move to make for any given state. If by chance the AI does something that we want to encourage, it is given a positive reward. Otherwise, the AI does something bad and is given a negative reward.

When the program starts, the AI has no concept of what is considered "good" or "bad," nor does it have any experience with the current problem. The AI starts out by making random moves until it happens to run into the goal. Each time the AI reaches the goal, it is reset back to the start position and the process is repeated, this time with added experience. Through experience, the AI eventually realizes that the goal tile is "good" and starts associating tiles around the goal with a positive reward and tiles away from the goal with a negative reward. Each time the player moves to a tile, that tile is given a numerical value based on how "good" it is to be at that tile. As the program runs, tiles around the goal will accumulate a higher numerical value than tiles away from the goal. At the end of the program, all the AI needs to do to reach the goal is to move to the tile with the highest value possible.

The AI will train for 200 'episodes.' Each time the player reaches the goal, it is reset to the starting position and the number of episodes increases by 1. The program also takes advantage of exploration vs exploitation. As the number of episodes increases, there is a greater and greater chance that the AI will eploit the Q-learning algorithm and take the best possible move instead of taking a random move. 

While the AI is running, the tiles are colored based on their numerical value. Tiles closer to green have higher values, and tiles closer to red or dark red have lower values.

![alt text](https://github.com/adw5ke/MazeAI/blob/main/static/images/demo.png?raw=true)

**User Guide**

- *episodes* displays the current episode
- *iterations* displays the number of iterations the q learning algorithm took for each episode
- *score for previous episode* displays the score associated with the previous episode. The AI accumulates a score of -0.1 for each tile it traverses that is not the goal and gains 10 for reaching the goal.
- *state* represents the current state of the AI. The state can be one of the following:
  - asleep: the AI is not running
  - learning: the AI is running
  - solving: the AI has finished running and is now displaying the best possible path found
  - finished: the AI has solved the maze
  - killed: the AI was suspended

- tile notation:
  - 'p' represents the player
  - 'g' represents the goal
  - 'w' represents walls or obstacles
  - any traversable tile is given a numerical value

- Usage
  - Each maze is randomly generated. Use the sliders at the bottom left to adjust to the maze's height and width.
  - The maze's dimensions and the 'Wall Probability' are displayed above the sliders. 'Wall Probability' is the probability that a randomly generated tile is a wall.
  - Select 'create custom maze' to create your own maze. Click or click and drag over blank tiles to place walls. Click walls again to turn them back into blank spaces.
  - Once you are happy with the maze, select the 'start AI' button to start the program. During this time, you can select 'suspend AI' to kill the process at any time.
  - *the ability to adjust the maze's dimensions is disabled once the program has started*


To use:
* clone the repository
* change directory into the folder
* run the command ```python server.py```, installing any packages as necessary
* visit [localhost:5000](http://127.0.0.1:5000/) and get started!

