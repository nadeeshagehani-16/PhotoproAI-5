# M3 Photography Services validation live test (rules: dates, negatives, time end>start)
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

# Fixtures
$cid = (Try-Api 'Get' '/customers' $null).res.data[0]._id
$pkgId = (Try-Api 'Get' '/packages' $null).res.data[0]._id
$phId = (Try-Api 'Get' '/photographers' $null).res.data[0]._id
T "SETUP fixtures" ($cid -and $pkgId -and $phId) 'missing'

# ═══ RULE 1: Dates today/future only ═══
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$past; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=5000 }
T "R1a past date rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"created"} else {$r.msg})

$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$future; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=5000 }
T "R1b future date accepted" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$sbId = if ($r.ok) { $r.res.data._id } else { $null }

if ($sbId) {
  $r = Try-Api 'Put' "/service-bookings/$sbId" @{ date=$past }
  T "R1c update to past date rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"updated"} else {$r.msg})
}

# ═══ RULE 2: No negative values ═══
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Portrait'; date=$future; startTime='15:00'; endTime='17:00'; location='Kandy'; amount=-100 }
T "R2a negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"created"} else {$r.msg})

if ($sbId) {
  $r = Try-Api 'Put' "/service-bookings/$sbId" @{ amount=-100 }
  T "R2b update negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"updated"} else {$r.msg})
}

$r = Try-Api 'Post' '/packages' @{ name='M3 Neg Pkg'; price=-100; duration='8 hours'; photographerCount=2 }
T "R2c package negative price rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"created"} else {$r.msg})

$r = Try-Api 'Put' "/packages/$pkgId" @{ price=-100 }
T "R2d package update negative price rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"updated"} else {$r.msg})

$r = Try-Api 'Put' "/packages/$pkgId" @{ price=0 }
T "R2e zero price accepted" ($r.ok) $(if ($r.ok) {"updated"} else {$r.msg})

# ═══ RULE 3: End time > start time ═══
# 3a: end < start (e.g., start 14:00, end 12:00)
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Corporate'; date=$future; startTime='14:00'; endTime='12:00'; location='Galle'; amount=2000 }
T "R3a end<start rejected" (-not $r.ok -and $r.msg -match 'after start') $(if ($r.ok) {"created"} else {$r.msg})

# 3b: end == start (e.g., start 10:00, end 10:00)
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Portrait'; date=$future; startTime='10:00'; endTime='10:00'; location='Kandy'; amount=1000 }
T "R3b end==start rejected" (-not $r.ok -and $r.msg -match 'after start') $(if ($r.ok) {"created"} else {$r.msg})

# 3c: end > start (valid)
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Engagement'; date=$future; startTime='16:00'; endTime='18:00'; location='Negombo'; amount=3000 }
T "R3c end>start accepted" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$sb2Id = if ($r.ok) { $r.res.data._id } else { $null }

# 3d: update end<start
if ($sbId) {
  $r = Try-Api 'Put' "/service-bookings/$sbId" @{ endTime='09:00' }
  T "R3d update end<start rejected" (-not $r.ok -and $r.msg -match 'after start') $(if ($r.ok) {"updated"} else {$r.msg})
}

# 3e: invalid time format
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Other'; date=$future; startTime='25:00'; endTime='26:00'; location='X'; amount=100 }
T "R3e invalid time format rejected" (-not $r.ok -and $r.msg -match 'time|format') $(if ($r.ok) {"created"} else {$r.msg})

# ═══ Cleanup ═══
if ($sbId) { Try-Api 'Delete' "/service-bookings/$sbId" $null | Out-Null }
if ($sb2Id) { Try-Api 'Delete' "/service-bookings/$sb2Id" $null | Out-Null }
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
