@echo off
rem MusicMash one-click launcher: sets up on first run, starts everything, opens the browser.
rem Press any key in this window (or close it) to stop MusicMash.
title MusicMash launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1"
