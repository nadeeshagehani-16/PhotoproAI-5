# M5 Studio Booking Validation Test Suite (live API, PowerShell 5.1 safe)
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000/api'

# ── Setup: login ──
$loginBody = @{ email = 'test@test.com'; password = 'test123' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType 'application/json' -TimeoutSec 10
} catch {
  Write-Host "LOGIN FAILED: $($_.Exception.Message)"; exit 1
}
$token = $login.data.token
if (-not $token) { Write-Host "LOGIN FAILED: no token returned"; exit 1 }
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
    if ($_.ErrorDetails.Message) {
      try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
    }
    return @{ ok = $false; msg = $msg }
  }
}

# Local dates
$today = Get-Date -Format 'yyyy-MM-dd'
$past = (Get-Date).AddDays(-7).ToString('yyyy-MM-dd')
$future = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')

# ── Setup: dedicated test studio (avoids overlap collisions with real data) ──
$studioName = 'M5 Validation Test Studio'
$r = Try-Api 'Post' '/studios' @{ name = $studioName; location = 'Test Wing B, Level 5'; capacity = 5; pricePerHour = 1000; availability = 'Available' }
$studioId = $null
if ($r.ok) { $studioId = $r.res.data._id }
Test-Case "SETUP create dedicated test studio" ($null -ne $studioId) $r.msg
if (-not $studioId) { exit 1 }

$cust = Try-Api 'Get' '/customers' $null
$customerId = $null
if ($cust.ok -and $cust.res.data.Count -gt 0) { $customerId = $cust.res.data[0]._id }
Test-Case "SETUP fetch a customer" ($null -ne $customerId) 'no customers found'
if (-not $customerId) {
  Try-Api 'Delete' "/studios/$studioId" $null | Out-Null
  exit 1
}

$createdIds = @()

# ── Studio booking validation (create) ──
$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $past; startTime = '10:00'; endTime = '12:00'; purpose = 'Past date test'; totalCost = 100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R1  create past date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '10:00'; endTime = '12:00'; purpose = 'Neg cost test'; totalCost = -100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R2  create negative cost rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R3  create missing required fields rejected" (-not $r.ok -and $r.msg -match 'required') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '9am'; endTime = '12:00'; purpose = 'Bad time test'; totalCost = 0 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R4  create invalid time format rejected" (-not $r.ok -and $r.msg -match 'format') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '14:00'; endTime = '12:00'; purpose = 'End before start test'; totalCost = 0 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R5  create end<=start rejected" (-not $r.ok -and $r.msg -match 'after start') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = 'not-a-valid-objectid'; customerId = $customerId; date = $future; startTime = '10:00'; endTime = '12:00'; purpose = 'Bad id test'; totalCost = 0 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R6  create invalid studio ID rejected" (-not $r.ok -and $r.msg -match 'ID format') $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '10:00'; endTime = '12:00'; purpose = 'M5 valid booking one'; totalCost = 2000; status = 'Confirmed' }
$b1 = $null
if ($r.ok) { $b1 = $r.res.data._id; $createdIds += $b1 }
$detail = if ($r.ok) { "created $b1" } else { $r.msg }
Test-Case "R7  create valid booking accepted" ($r.ok) $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '18:00'; endTime = '19:00'; purpose = 'M5 zero cost booking'; totalCost = 0 }
$bz = $null
if ($r.ok) { $bz = $r.res.data._id; $createdIds += $bz }
$detail = if ($r.ok) { "created $bz" } else { $r.msg }
Test-Case "R8  create zero-cost booking accepted" ($r.ok) $detail

$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '11:00'; endTime = '13:00'; purpose = 'Overlap test'; totalCost = 0 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "R9  overlapping create rejected" (-not $r.ok -and $r.msg -match 'already booked') $detail

# ── Studio booking validation (update) ──
$r = Try-Api 'Put' "/studio-bookings/$b1" @{ date = $past }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "R10 update past date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Put' "/studio-bookings/$b1" @{ totalCost = -100 }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "R11 update negative cost rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Put' "/studio-bookings/$b1" @{ startTime = '15:00'; endTime = '14:00' }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "R12 update end<=start rejected" (-not $r.ok -and $r.msg -match 'after start') $detail

$r = Try-Api 'Put' "/studio-bookings/$b1" @{ totalCost = 2500 }
$detail = if ($r.ok) { 'updated' } else { $r.msg }
Test-Case "R13 valid update accepted" ($r.ok) $detail

# ── Conflict detection on update ──
$r = Try-Api 'Post' '/studio-bookings' @{ studioId = $studioId; customerId = $customerId; date = $future; startTime = '14:00'; endTime = '16:00'; purpose = 'M5 valid booking two'; totalCost = 1000; status = 'Confirmed' }
$b2 = $null
if ($r.ok) { $b2 = $r.res.data._id; $createdIds += $b2 }
Test-Case "R14a second valid booking created" ($r.ok) $r.msg

$r = Try-Api 'Put' "/studio-bookings/$b2" @{ startTime = '11:30'; endTime = '13:00' }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "R14b update to overlapping slot rejected" (-not $r.ok -and $r.msg -match 'already booked') $detail

$r = Try-Api 'Put' "/studio-bookings/$b2" @{ startTime = '15:00'; endTime = '17:00' }
$detail = if ($r.ok) { 'updated' } else { $r.msg }
Test-Case "R14c valid non-overlapping update accepted" ($r.ok) $detail

# ── Available slots endpoint ──
$r = Try-Api 'Get' "/studio-bookings/available-slots?studioId=$studioId&date=$future" $null
$slotsOk = $false
if ($r.ok -and $r.res.data.availableSlots -and $r.res.data.availableSlots.Count -gt 0) { $slotsOk = $true }
Test-Case "R15 available slots endpoint works" ($slotsOk) $r.msg

# ── Studio validation ──
$r = Try-Api 'Post' '/studios' @{ name = 'Neg Price Studio'; location = 'Somewhere'; pricePerHour = -100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "S1  studio negative price rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Post' '/studios' @{ location = 'Somewhere'; pricePerHour = 100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
Test-Case "S2  studio missing name rejected" (-not $r.ok -and $r.msg -match 'required') $detail

$r = Try-Api 'Put' "/studios/$studioId" @{ pricePerHour = -50 }
$detail = if ($r.ok) { 'unexpectedly updated' } else { $r.msg }
Test-Case "S3  studio update negative price rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Put' "/studios/$studioId" @{ pricePerHour = 1200 }
$detail = if ($r.ok) { 'updated' } else { $r.msg }
Test-Case "S4  studio valid update accepted" ($r.ok) $detail

# ── Cleanup ──
foreach ($bid in $createdIds) {
  Try-Api 'Delete' "/studio-bookings/$bid" $null | Out-Null
}
Try-Api 'Delete' "/studios/$studioId" $null | Out-Null
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
