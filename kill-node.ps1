# Kill all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "All Node.js processes have been terminated."