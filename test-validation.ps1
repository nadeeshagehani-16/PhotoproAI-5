$BASE = 'http://localhost:5000/api'
$lb = @{ email='test@test.com'; password='test123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $lb -ContentType 'application/json'
$H = @{ Authorization = 'Bearer ' + $login.data.token }
$pass = 0; $fail = 0
function Check($n, $c) { if($c){ $script:pass++; Write-Output ("PASS: " + $n) } else { $script:fail++; Write-Output ("FAIL: " + $n) } }

Write-Output '=== Studio Booking Validation (Backend) ==='

# SB1: Past date rejected
try {
  $studios = Invoke-RestMethod -Uri "$BASE/studios" -Method GET -Headers $H
  $custs = Invoke-RestMethod -Uri "$BASE/customers" -Method GET -Headers $H
  $sid = @($studios.data)[0]._id
  $cid = @($custs.data)[0]._id
  $pastDate = (Get-Date).AddDays(-5).ToString('yyyy-MM-dd')
  $body = @{ studioId=$sid; customerId=$cid; date=$pastDate; startTime='10:00'; endTime='12:00'; purpose='test'; totalCost=100; status='Pending' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'SB1 past date rejected' $false
} catch { Check 'SB1 past date rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# SB2: End before start rejected
try {
  $futureDate = (Get-Date).AddDays(60).ToString('yyyy-MM-dd')
  $body = @{ studioId=$sid; customerId=$cid; date=$futureDate; startTime='14:00'; endTime='10:00'; purpose='test'; totalCost=100; status='Pending' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'SB2 end before start rejected' $false
} catch { Check 'SB2 end before start rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# SB3: Negative cost rejected
try {
  $body = @{ studioId=$sid; customerId=$cid; date=$futureDate; startTime='10:00'; endTime='12:00'; purpose='test'; totalCost=-500; status='Pending' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'SB3 negative cost rejected' $false
} catch { Check 'SB3 negative cost rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# SB4: Missing purpose rejected
try {
  $body = @{ studioId=$sid; customerId=$cid; date=$futureDate; startTime='10:00'; endTime='12:00'; purpose=''; totalCost=100; status='Pending' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'SB4 missing purpose rejected' $false
} catch { Check 'SB4 missing purpose rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# SB5: Valid booking created
try {
  $body = @{ studioId=$sid; customerId=$cid; date=$futureDate; startTime='10:00'; endTime='12:00'; purpose='Validation test'; totalCost=5000; status='Confirmed' } | ConvertTo-Json
  $created = Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H
  Check 'SB5 valid booking created' ($created.success -eq $true)
  $testId = $created.data._id
} catch { Check 'SB5 valid booking created' $false }

# SB6: Update with negative cost rejected
try {
  $ubody = @{ totalCost = -100 } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studio-bookings/$testId" -Method PUT -Body $ubody -ContentType 'application/json' -Headers $H | Out-Null
  Check 'SB6 update negative cost rejected' $false
} catch { Check 'SB6 update negative cost rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# SB7: Update with valid data succeeds
try {
  $ubody = @{ purpose = 'Updated purpose'; totalCost = 8000 } | ConvertTo-Json
  $updated = Invoke-RestMethod -Uri "$BASE/studio-bookings/$testId" -Method PUT -Body $ubody -ContentType 'application/json' -Headers $H
  Check 'SB7 valid update succeeds' ($updated.success -eq $true -and $updated.data.purpose -eq 'Updated purpose')
} catch { Check 'SB7 valid update succeeds' $false }

# Cleanup
try { Invoke-RestMethod -Uri "$BASE/studio-bookings/$testId" -Method DELETE -Headers $H | Out-Null } catch {}

Write-Output ''
Write-Output '=== Studio Validation (Backend) ==='

# S1: Empty name rejected
try {
  $body = @{ name=''; location='Colombo'; pricePerHour=5000 } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studios" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'S1 empty name rejected' $false
} catch { Check 'S1 empty name rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# S2: Negative price rejected
try {
  $body = @{ name='Test Studio'; location='Colombo'; pricePerHour=-1000; capacity=10 } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studios" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'S2 negative price rejected' $false
} catch { Check 'S2 negative price rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# S3: Invalid availability rejected
try {
  $body = @{ name='Test Studio'; location='Colombo'; pricePerHour=5000; capacity=10; availability='Invalid' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/studios" -Method POST -Body $body -ContentType 'application/json' -Headers $H | Out-Null
  Check 'S3 invalid availability rejected' $false
} catch { Check 'S3 invalid availability rejected' ($_.Exception.Response.StatusCode.value__ -eq 400) }

# S4: Valid studio created
try {
  $body = @{ name='Validation Test Studio'; location='Test Location'; pricePerHour=3000; capacity=5; availability='Available' } | ConvertTo-Json
  $created = Invoke-RestMethod -Uri "$BASE/studios" -Method POST -Body $body -ContentType 'application/json' -Headers $H
  Check 'S4 valid studio created' ($created.success -eq $true)
  $studioTestId = $created.data._id
} catch { Check 'S4 valid studio created' $false }

# Cleanup
try { Invoke-RestMethod -Uri "$BASE/studios/$studioTestId" -Method DELETE -Headers $H | Out-Null } catch {}

Write-Output ''
Write-Output '=== Calendar API Connection ==='

# C1: Studio bookings returned with populated data
$stb = Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method GET -Headers $H
Check 'C1 bookings returned' (@($stb.data).Count -gt 0)
$hasStudio = @($stb.data) | Where-Object { $_.studioId.name -ne $null }
Check 'C2 studio names populated' (@($hasStudio).Count -gt 0)

# C3: Available slots endpoint works
$slotsDate = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$slotsUrl = "$BASE/studio-bookings/available-slots?studioId=$sid" + "&date=$slotsDate"
$slots = Invoke-RestMethod -Uri $slotsUrl -Method GET -Headers $H
Check 'C3 available slots works' (@($slots.data.availableSlots).Count -eq 14)

Write-Output ''
Write-Output "=== Results: $pass passed, $fail failed ==="
