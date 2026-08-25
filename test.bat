@echo off
curl -s -X POST http://localhost:8080/api/v1/auth/register -H "Content-Type: application/json" -d "{\"email\":\"admin3@stride.com\", \"password\":\"password123\", \"role\":\"ADMIN\"}"
echo.
