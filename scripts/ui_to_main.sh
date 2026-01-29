#!/bin/bash

# Switch to main branch
git checkout main

# Reset main to match ui exactly
git reset --hard ui

# Force push to remote (this overwrites main completely)
git push origin main --force
