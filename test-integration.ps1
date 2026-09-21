# Integration validation test: all 5 members, rules 1 (dates today/future) + 2 (no negatives)
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000/api'
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body (@{email='test@test.com';password='test123'}|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 10
$token = $login.data.token
if (-not $token) { Write-Host "LOGIN FAILED"; exit 1 }
$headers = @{ Authorization = "Bearer $token" }
Write-Host "[setup] Logged in OK"

$script:passed = 0; $script:failed = 0
function T($name, $cond, $detail) {
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

$past = (Get-Date).AddDays(-5).ToString('yyyy-MM-dd')
$future = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
$cleanup = @()

# ── Fixtures ──
$cid = (Try-Api 'Get' '/customers' $null).res.data[0]._id
$eid = ((Try-Api 'Get' '/equipment' $null).res.data | Where-Object { $_.availability -ne 'Under Maintenance' } | Select-Object -First 1)._id
$pkgId = (Try-Api 'Get' '/packages' $null).res.data[0]._id
$phId = (Try-Api 'Get' '/photographers' $null).res.data[0]._id
T "SETUP fixtures (customer/equipment/package/photographer)" ($cid -and $eid -and $pkgId -and $phId) 'missing one or more'

# ════ MEMBER 1 (users/customers): email + negative spent ════
$r = Try-Api 'Post' '/customers' @{ name='Int Test Cust'; email='bad#email@test.com'; phone='+1 555 111 2222' }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M1  customer email with # rejected" (-not $r.ok -and $r.msg -match 'email') $detail

$r = Try-Api 'Post' '/customers' @{ name='Int Test Cust'; email='BAD$Email@test.com'; phone='+1 555 111 2222' }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M1  customer email with $ rejected" (-not $r.ok -and $r.msg -match 'email') $detail

$r = Try-Api 'Post' '/customers' @{ name='Int Test Cust'; email="inttest$(Get-Random -Maximum 99999)@test.com"; phone='+1 555 111 2222'; spent=-100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M1  customer negative spent rejected" (-not $r.ok -and $r.msg -match 'negative|spent') $detail

$r = Try-Api 'Post' '/customers' @{ name='Int Test Cust'; email="inttest$(Get-Random -Maximum 99999)@test.com"; phone='+1 555 111 2222'; spent=0 }
$detail = if ($r.ok) { "created $($r.res.data._id)" } else { $r.msg }
T "M1  customer zero spent accepted" ($r.ok) $detail
if ($r.ok) { $cleanup += "/customers/$($r.res.data._id)" }

# ════ MEMBER 2 (equipment/rentals): dates + negatives ════
$r = Try-Api 'Post' '/equipment' @{ name='Int Test Cam'; brand='Canon'; model='R5'; category='Camera'; pricePerDay=-100; quantity=1 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M2  equipment negative price rejected" (-not $r.ok -and $r.msg -match 'negative|price') $detail

$r = Try-Api 'Post' '/rentals' @{ customerId=$cid; equipmentId=$eid; startDate=$past; endDate=$future; totalCost=100; securityDeposit=50 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M2  rental past start date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/rentals' @{ customerId=$cid; equipmentId=$eid; startDate=$future; endDate=(Get-Date).AddDays(9).ToString('yyyy-MM-dd'); totalCost=-100; securityDeposit=50 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M2  rental negative cost rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

# ════ MEMBER 3 (packages/service-bookings): dates + negatives + email ════
$r = Try-Api 'Post' '/packages' @{ name='Int Test Pkg'; price=-100; duration='8 hours'; photographerCount=2 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M3  package negative price rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$past; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=5000 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M3  service-booking past date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$future; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=-100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M3  service-booking negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Post' '/photographers' @{ name='Int Test Ph'; email='bad#ph@test.com'; specialization='Portrait' }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M3  photographer email with # rejected" (-not $r.ok -and $r.msg -match 'email') $detail

# ════ MEMBER 4 (payments/deposits): dates + negatives ════
$r = Try-Api 'Post' '/payments' @{ customerId=$cid; amount=500; method='Cash'; type='Booking'; date=$past }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M4  payment past date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

$r = Try-Api 'Post' '/payments' @{ customerId=$cid; amount=-100; method='Cash'; type='Rental'; date=$future }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M4  payment negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$r = Try-Api 'Post' '/deposits' @{ customerId=$cid; amount=-100; purpose='Int test deposit'; paymentMethod='Cash' }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M4  deposit negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

# ════ MEMBER 5 (studios/studio-bookings): dates + negatives ════
$r = Try-Api 'Post' '/studios' @{ name='Int Test Studio'; location='Colombo'; capacity=10; pricePerHour=-100 }
$detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
T "M5  studio negative pricePerHour rejected" (-not $r.ok -and $r.msg -match 'negative') $detail

$studio = Try-Api 'Get' '/studios' $null
$studioId = $null
if ($studio.ok -and $studio.res.data.Count -gt 0) { $studioId = $studio.res.data[0]._id }
if ($studioId) {
  $r = Try-Api 'Post' '/studio-bookings' @{ studioId=$studioId; customerId=$cid; date=$past; startTime='10:00'; endTime='12:00'; purpose='Test'; totalCost=100 }
  $detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
  T "M5  studio-booking past date rejected" (-not $r.ok -and $r.msg -match 'past') $detail

  $r = Try-Api 'Post' '/studio-bookings' @{ studioId=$studioId; customerId=$cid; date=$future; startTime='10:00'; endTime='12:00'; purpose='Test'; totalCost=-100 }
  $detail = if ($r.ok) { 'unexpectedly created' } else { $r.msg }
  T "M5  studio-booking negative cost rejected" (-not $r.ok -and $r.msg -match 'negative') $detail
} else {
  Write-Host "SKIP M5 studio-booking tests - no studio fixture"
}

# ── Cleanup ──
foreach ($u in $cleanup) { Try-Api 'Delete' $u $null | Out-Null }
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
