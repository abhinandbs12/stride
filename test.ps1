$ErrorActionPreference = 'Stop'
try {
    $BODY = '{"email":"admin2@stride.com", "password":"password123", "role":"ADMIN"}'
    $response = Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/register -Method Post -Body $BODY -ContentType "application/json"
    $response | ConvertTo-Json
} catch {
    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $ErrResp = $streamReader.ReadToEnd()
    $streamReader.Close()
    Write-Host "HTTP Error Response:"
    Write-Host $ErrResp
}
