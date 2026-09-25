@echo off
setlocal
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
if not exist classes mkdir classes
javac -encoding UTF-8 -d classes src\spooktacular\data\Data.java src\spooktacular\engine\Engine.java src\spooktacular\game\MazePanel.java src\spooktacular\game\Tabs.java src\spooktacular\game\Main.java src\spooktacular\game\TestEngine.java
if errorlevel 1 exit /b 1
java -cp classes spooktacular.game.TestEngine
if errorlevel 1 exit /b 1
java -cp classes spooktacular.game.Main
