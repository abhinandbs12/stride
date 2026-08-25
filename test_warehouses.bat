@echo off
setlocal
for /f "tokens=*" %%a in ('curl -s -X POST http://localhost:8080/api/v1/auth/register -H "Content-Type: application/json" -d "{\"email\":\"admin4@stride.com\", \"password\":\"password123\", \"role\":\"ADMIN\"}" ^| powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty accessToken"') do set TOKEN=%%a

echo Access Token: %TOKEN%
echo.
echo Fetching Warehouses:
curl -s -H "Authorization: Bearer %TOKEN%" http://localhost:8080/api/v1/warehouses | powershell -Command "$input | ConvertFrom-Json | ConvertTo-Json -Depth 5"
echo.
