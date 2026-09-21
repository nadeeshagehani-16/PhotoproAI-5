# M4 Payment/Deposit validation live test (rules: dates today/future, no negatives)
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
T "SETUP customer" ($cid) 'missing'

# ═══ PAYMENTS ═══
Write-Host "`n--- PAYMENTS ---"

# R1a: payment past date rejected
$r = Try-Api 'Post' '/payments' @{ customerId=$cid; amount=1000; method='Cash'; type='Booking'; date=$past }
T "R1a payment past date rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"created"} else {$r.msg})

# R1b: payment future date accepted
$r = Try-Api 'Post' '/payments' @{ customerId=$cid; amount=1000; method='Cash'; type='Booking'; date=$future }
T "R1b payment future date accepted" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$payId = if ($r.ok) { $r.res.data._id } else { $null }

# R1c: payment update to past date rejected
if ($payId) {
  $r = Try-Api 'Put' "/payments/$payId" @{ date=$past }
  T "R1c payment update past date rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"updated"} else {$r.msg})
}

# R2a: payment negative amount rejected
$r = Try-Api 'Post' '/payments' @{ customerId=$cid; amount=-100; method='Credit Card'; type='Booking'; date=$future }
T "R2a payment negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"created"} else {$r.msg})

# R2b: payment update negative amount rejected
if ($payId) {
  $r = Try-Api 'Put' "/payments/$payId" @{ amount=-100 }
  T "R2b payment update negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"updated"} else {$r.msg})
}

# R2c: payment zero amount accepted
$r = Try-Api 'Put' "/payments/$payId" @{ amount=0 }
T "R2c payment zero amount accepted" ($r.ok) $(if ($r.ok) {"updated"} else {$r.msg})

# ═══ DEPOSITS ═══
Write-Host "`n--- DEPOSITS ---"

# R1d: deposit with future date (refundDate) accepted
$r = Try-Api 'Post' '/deposits' @{ customerId=$cid; amount=500; purpose='Security Deposit'; paymentMethod='Cash' }
T "DEP deposit create" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$depId = if ($r.ok) { $r.res.data._id } else { $null }

# R2d: deposit negative amount rejected
$r = Try-Api 'Post' '/deposits' @{ customerId=$cid; amount=-200; purpose='Security Deposit'; paymentMethod='Cash' }
T "R2d deposit negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"created"} else {$r.msg})

# R2e: deposit update negative amount rejected
if ($depId) {
  $r = Try-Api 'Put' "/deposits/$depId" @{ amount=-200 }
  T "R2e deposit update negative amount rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"updated"} else {$r.msg})
}

# R2f: deposit negative refundAmount rejected
if ($depId) {
  $r = Try-Api 'Put' "/deposits/$depId" @{ refundAmount=-50 }
  T "R2f deposit negative refund rejected" (-not $r.ok -and $r.msg -match 'negative') $(if ($r.ok) {"updated"} else {$r.msg})
}

# R2g: deposit zero amount accepted
if ($depId) {
  $r = Try-Api 'Put' "/deposits/$depId" @{ amount=0 }
  T "R2g deposit zero amount accepted" ($r.ok) $(if ($r.ok) {"updated"} else {$r.msg})
}

# R2h: deposit refund > amount rejected
if ($depId) {
  $r = Try-Api 'Put' "/deposits/$depId" @{ amount=100; refundAmount=200 }
  T "R2h deposit refund>amount rejected" (-not $r.ok -and $r.msg -match 'exceed') $(if ($r.ok) {"updated"} else {$r.msg})
}

# ═══ Cleanup ═══
if ($payId) { Try-Api 'Delete' "/payments/$payId" $null | Out-Null }
if ($depId) { Try-Api 'Delete' "/deposits/$depId" $null | Out-Null }
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
