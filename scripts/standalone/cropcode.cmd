@echo off
setlocal
set "CROPCODE_INSTALL_METHOD=standalone"
set "PATH=%~dp0runtime;%PATH%"
"%~dp0runtime\node.exe" "%~dp0app\node_modules\@yuanyuanma03\cropcode-cli\cli.js" %*
exit /b %errorlevel%
