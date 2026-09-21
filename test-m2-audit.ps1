# M2 Equipment/Rental Validation - Comprehensive Live Test Suite (PowerShell 5.1 safe)
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000/api'

$loginBody = @{ email = 'test@test.com'; password = 'test123' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType 'application/json' -TimeoutSec 10
} catch { Write-Host "LOGIN FAILED: $($_.Exception.Message)"; exit 1 }
$token = $login.data.token
if (-not $token) { Write-Host "LOGIN FAILED: no token"; exit 1 }
$headers = @{ Authorization = "Bearer $token" }
Write-Host "[setup] Logged in OK"

$script:passed = 0
$script:failed = 0
function Test-Case($name, $cond, $detail) {
  if ($cond) { $script:passed++; Write-Host "PASS  $name" }
  else { $script:failed++; Write-Host "FAIL  $name  >> $detail" }
}
function Try-Api($method, $path, $body) {
  try {
    $p = @{ Uri = "$base$path"; Method = $method; Headers = $headers; ContentType = 'application/json'; TimeoutSec = 20 }
    if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 5) }
    $res = Invoke-RestMethod @p
    return @{ ok = $true; res = $res }
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails.Message) { try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {} }
    return @{ ok = $false; msg = $msg }
  }
}

$past = (Get-Date).AddDays(-7).ToString('yyyy-MM-dd')
$today = Get-Date -Format 'yyyy-MM-dd'
$futA = (Get-Date).AddDays(5).ToString('yyyy-MM-dd')
$futB = (Get-Date).AddDays(8).ToString('yyyy-MM-dd')

# ── Fixtures: dedicated test equipment (avoids overlap with real data) ──
$r = Try-Api 'Post' '/equipment' @{ name = 'M2 Audit Test Camera'; category = 'Camera'; brand = 'TestBrand'; model = 'T-100'; pricePerDay = 500; condition = 'Good'; availability = 'Available' }
$equipId = $null
if ($r.ok) { $equipId = $r.res.data._id }
Test-Case "SETUP create test equipment" ($null -ne $equipId) $r.msg
if (-not $equipId) { exit 1 }

$cust = Try-Api 'Get' '/customers' $null
$custId = $null
if ($cust.ok -and $cust.res.data.Count -gt 0) { $custId = $cust.res.data[0]._id }
Test-Case "SETUP fetch a customer" ($null -ne $custId) 'none found'
if (-not $custId) { Try-Api 'Delete' "/equipment/$equipId" $null | Out-Null; exit 1 }

$rentalId = $null

# ── Rule 1: dates today/future only ──
$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $past; endDate = $futA; totalCost = 100; securityDeposit = 50 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R1a create past start date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $today; endDate = $past; totalCost = 100; securityDeposit = 50 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R1b create past end date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $today; endDate = $futA; totalCost = 100; securityDeposit = 50 }
$detail = if ($r.ok) { "created $($r.res.data._id)" } else { $r.msg }
Test-Case "R1c create starting today accepted (today is allowed)" ($r.ok) $detail
if ($r.ok) { $rentalId = $r.res.data._id }

# ── Rule 2: no negative values ──
$r = Try-Api 'Post' '/equipment' @{ name = 'Neg Price Cam'; category = 'Camera'; brand = 'TestBrand'; model = 'X'; pricePerDay = -100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R2a equipment negative price rejected (create)" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Put' "/equipment/$equipId" @{ pricePerDay = -100 }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "R2b equipment negative price rejected (update)" (-not $r.ok -and $r.msg -match 'negative') $detail

if ($rentalId) {
  $r = Try-Api 'Put' "/rentals/$rentalId" @{ totalCost = -100 }
  $detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
  Test-Case "R2c rental negative total cost rejected (update)" (-not $r.ok -and $r.msg -match 'negative') $detail

  $r = Try-Api 'Put' "/rentals/$rentalId" @{ securityDeposit = -50 }
  $detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
  Test-Case "R2d rental negative deposit rejected (update)" (-not $r.ok -and $r.msg -match 'negative') $detail
}

$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $futB; endDate = (Get-Date).AddDays(9).ToString('yyyy-MM-dd'); totalCost = 0; securityDeposit = -100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R2e rental negative deposit rejected (create)" (-not $r.ok -and $r.msg -match 'negative') $detail

# ── Rule 4: required fields ──
$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R4a rental missing required fields rejected" (-not $r.ok -and $r.msg -match 'required') $detail

$r = Try-Api 'Post' '/equipment' @{ brand = 'TestBrand'; model = 'X'; pricePerDay = 100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R4b equipment missing name/category rejected" (-not $r.ok -and $r.msg -match 'required') $detail

# ── Consistency: invalid formats + end>start + zero allowed ──
$r = Try-Api 'Post' '/rentals' @{ customerId = 'not-an-objectid'; equipmentId = $equipId; startDate = $futB; endDate = (Get-Date).AddDays(9).ToString('yyyy-MM-dd'); totalCost = 100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "C1  invalid customer ObjectId rejected" (-not $r.ok -and $r.msg -match 'ID format') $detail

$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $futB; endDate = $futB; totalCost = 100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "C2  end date not after start rejected" (-not $r.ok -and $r.msg -match 'after the start date') $detail

$r = Try-Api 'Put' "/equipment/$equipId" @{ pricePerDay = 0 }
$detail = if ($r.ok) { 'updated to 0' } else { $r.msg }
Test-Case "C3  zero price accepted (valid non-negative)" ($r.ok) $detail

# ── Regression: overlap detection + availability auto-update ──
$r = Try-Api 'Post' '/rentals' @{ customerId = $custId; equipmentId = $equipId; startDate = $today; endDate = $futA; totalCost = 100; securityDeposit = 0 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "C4  overlapping rental rejected" (-not $r.ok -and $r.msg -match 'already booked') $detail

$eq = Try-Api 'Get' "/equipment/$equipId" $null
$avail = $null
if ($eq.ok) { $avail = $eq.res.data.availability }
Test-Case "C5  equipment auto-set to Rented after rental" ($avail -eq 'Rented') "availability=$avail"

if ($rentalId) {
  $r = Try-Api 'Put' "/rentals/$rentalId" @{ status = 'Returned' }
  $detail = if ($r.ok) { 'updated' } else { $r.msg }
  Test-Case "C6  valid status update accepted" ($r.ok) $detail

  $eq = Try-Api 'Get' "/equipment/$equipId" $null
  $avail = $null
  if ($eq.ok) { $avail = $eq.res.data.availability }
  Test-Case "C7  equipment auto-restored to Available after return" ($avail -eq 'Available') "availability=$avail"
}

# ── Cleanup ──
if ($rentalId) { Try-Api 'Delete' "/rentals/$rentalId" $null | Out-Null }
Try-Api 'Delete' "/equipment/$equipId" $null | Out-Null
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
