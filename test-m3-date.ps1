# M3 date validation quick test
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000/api'
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body (@{email='test@test.com';password='test123'}|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 10
$token = $login.data.token
if (-not $token) { Write-Host "LOGIN FAILED"; exit 1 }
$headers = @{ Authorization = "Bearer $token" }

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
$cid = (Try-Api 'Get' '/customers' $null).res.data[0]._id
$pkgId = (Try-Api 'Get' '/packages' $null).res.data[0]._id
$phId = (Try-Api 'Get' '/photographers' $null).res.data[0]._id
T "SETUP fixtures" ($cid -and $pkgId -and $phId) 'missing'

# R1a: past date rejected on create
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$past; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=5000 }
T "R1a past date rejected on create" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"created"} else {$r.msg})

# R1b: future date accepted
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Wedding'; date=$future; startTime='10:00'; endTime='14:00'; location='Colombo'; amount=5000 }
T "R1b future date accepted" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$sbId = if ($r.ok) { $r.res.data._id } else { $null }

# R1c: update to past date rejected
if ($sbId) {
  $r = Try-Api 'Put' "/service-bookings/$sbId" @{ date=$past }
  T "R1c update to past date rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"updated"} else {$r.msg})
}

# R1d: today's date accepted
$today = (Get-Date).ToString('yyyy-MM-dd')
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Portrait'; date=$today; startTime='16:00'; endTime='18:00'; location='Kandy'; amount=2000 }
T "R1d today date accepted" ($r.ok) $(if ($r.ok) {"created $($r.res.data._id)"} else {$r.msg})
$sb2Id = if ($r.ok) { $r.res.data._id } else { $null }

# R1e: yesterday rejected
$yesterday = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')
$r = Try-Api 'Post' '/service-bookings' @{ customerId=$cid; packageId=$pkgId; photographerId=$phId; event='Corp'; date=$yesterday; startTime='09:00'; endTime='11:00'; location='Galle'; amount=1000 }
T "R1e yesterday rejected" (-not $r.ok -and $r.msg -match 'past') $(if ($r.ok) {"created"} else {$r.msg})

# Cleanup
if ($sbId) { Try-Api 'Delete' "/service-bookings/$sbId" $null | Out-Null }
if ($sb2Id) { Try-Api 'Delete' "/service-bookings/$sb2Id" $null | Out-Null }
Write-Host ""
Write-Host "RESULT: $script:passed passed, $script:failed failed"
if ($script:failed -eq 0) { Write-Host "ALL TESTS PASSED" } else { Write-Host "SOME TESTS FAILED" }
