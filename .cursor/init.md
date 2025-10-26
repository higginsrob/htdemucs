# Cursor Project Rules and Instructions

- Your task is to generate this repository, including a .cursor/rules.md file that contains information describing how a coding agent seeing it for the first time can work most efficiently.
- You will do this task only one time per repository and doing a good job can SIGNIFICANTLY improve the quality of the agent's work, so take your time, think carefully, and search thoroughly before writing the instructions.
- Provide the agent with all the information it needs to understand the codebase, build, test, validate, and demo changes.
- Minimize the amount of searching the agent has to do to understand the codebase each time.
- Build the dev tooling to support the agent in building, testing, validating, and demoing changes.

## Project Description

This project aims to make running demucs <https://github.com/adefossez/demucs> easier. In the "demucs" folder we have a docker project that we control with our Makefile. This docker image is working well for developers using a command line, but we want to build a new docker image in the "server" folder that is more production friendly.  This new image will be based off of our demux image, but instead of using docker volumes to manage the input, model, and output files, we will use a server that is running inside the container to upload audio files and download a zip package.  This server will use socket.io to relay progress updates to a front end (static html, js, and css files) that we will build later.
