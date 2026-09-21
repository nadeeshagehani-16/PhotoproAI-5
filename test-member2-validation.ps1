# Member 2 validation test suite (Equipment + Rentals)
$ErrorActionPreference = 'Continue'
$BASE = 'http://localhost:5000/api'
$pass = 0; $fail = 0

function Check($name, $cond) {
  if ($cond) { $script:pass++; Write-Output ("PASS: " + $name) }
  else { $script:fail++; Write-Output ("FAIL: " + $name) }
}

# Login as Admin (equipment/rental routes require Admin or Staff)
$loginBody = @{ email = 'test@test.com'; password = 'test123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $loginBody -ContentType 'application/json'
$H = @{ Authorization = 'Bearer ' + $login.data.token }
Write-Output ("Logged in as: " + $login.data.user.email + " (" + $login.data.user.role + ")")

# Get an existing customer for rental tests
$custs = Invoke-RestMethod -Uri "$BASE/customers" -Method GET -Headers $H
$custId = @($custs.data)[0]._id
Write-Output ("Using customer: " + @($custs.data)[0].name + " (" + $custId + ")")

# Date fixtures
$startD = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
$endD = (Get-Date).AddDays(5).ToString('yyyy-MM-dd')
$endD2 = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
$pastD = (Get-Date).AddDays(-2).ToString('yyyy-MM-dd')

# ---- EQUIPMENT ----
try {
  $b = @{ name='Test Cam'; category='Camera'; brand='Canon'; model='R5'; pricePerDay='-100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/equipment" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "E1 equipment rejects negative price", $false
} catch { Check "E1 equipment rejects negative price" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='Test Cam'; category='Drone'; brand='Canon'; model='R5'; pricePerDay='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/equipment" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "E2 equipment rejects invalid category", $false
} catch { Check "E2 equipment rejects invalid category" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ category='Camera'; brand='Canon'; model='R5'; pricePerDay='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/equipment" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "E3 equipment rejects missing name", $false
} catch { Check "E3 equipment rejects missing name" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ name='Janani Test Camera'; category='Camera'; brand='Canon'; model='EOS R5'; pricePerDay='7500'; serialNumber='JN-2026-001' } | ConvertTo-Json
$eq = Invoke-RestMethod -Uri "$BASE/equipment" -Method POST -Body $b -ContentType 'application/json' -Headers $H
$eqId = $eq.data._id
Check "E4 valid equipment created" ($eq.success -eq $true -and $eqId)

try {
  $b = @{ pricePerDay='-50' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "E5 equipment update rejects negative price", $false
} catch { Check "E5 equipment update rejects negative price" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ pricePerDay='8000' } | ConvertTo-Json
$eqUpd = Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H
Check "E6 valid equipment update" ($eqUpd.success -eq $true -and $eqUpd.data.pricePerDay -eq 8000)

# ---- RENTALS ----
try {
  $b = @{ customerId=$custId; equipmentId=$eqId; startDate=$pastD; endDate=$endD; totalCost='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R1 rental rejects past start date", $false
} catch { Check "R1 rental rejects past start date" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ customerId=$custId; equipmentId=$eqId; startDate=$endD; endDate=$startD; totalCost='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R2 rental rejects end before start", $false
} catch { Check "R2 rental rejects end before start" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ customerId=$custId; equipmentId=$eqId; startDate=$startD; endDate=$endD; totalCost='100'; securityDeposit='-99' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R3 rental rejects negative deposit", $false
} catch { Check "R3 rental rejects negative deposit" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ customerId='not-an-objectid'; equipmentId=$eqId; startDate=$startD; endDate=$endD; totalCost='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R4 rental rejects invalid customer id", $false
} catch { Check "R4 rental rejects invalid customer id" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ customerId=$custId; equipmentId=$eqId; startDate=$startD; endDate=$endD; totalCost='22500'; securityDeposit='5000' } | ConvertTo-Json
$rent = Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H
$rentId = $rent.data._id
Check "R5 valid rental created" ($rent.success -eq $true -and $rentId)

# Equipment should be auto-marked Rented
$eqAfter = Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method GET -Headers $H
Check "R5b equipment auto-set to Rented" ($eqAfter.data.availability -eq 'Rented')

try {
  $b = @{ customerId=$custId; equipmentId=$eqId; startDate=$startD; endDate=$endD; totalCost='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R6 rental rejects overlapping booking", $false
} catch { Check "R6 rental rejects overlapping booking" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ startDate=$pastD } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals/$rentId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R7 rental update rejects past start date", $false
} catch { Check "R7 rental update rejects past start date" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ totalCost='-100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals/$rentId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R8 rental update rejects negative cost", $false
} catch { Check "R8 rental update rejects negative cost" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ endDate=$startD } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals/$rentId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R9 rental update rejects end before start", $false
} catch { Check "R9 rental update rejects end before start" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ endDate=$endD2; paymentStatus='Paid' } | ConvertTo-Json
$rentUpd = Invoke-RestMethod -Uri "$BASE/rentals/$rentId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H
Check "R10 valid rental update (extend end date)" ($rentUpd.success -eq $true)

# Maintenance block still works
$b = @{ availability='Under Maintenance' } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
try {
  $b = @{ customerId=$custId; equipmentId=$eqId; startDate=$endD2; endDate=$endD2; totalCost='100' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/rentals" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "R11 rental blocked for equipment under maintenance", $false
} catch { Check "R11 rental blocked for equipment under maintenance" ($_.Exception.Response.StatusCode.value__ -eq 400) }

# ---- CLEANUP ----
Invoke-RestMethod -Uri "$BASE/rentals/$rentId" -Method DELETE -Headers $H | Out-Null
$eqFinal = Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method GET -Headers $H
Check "Cleanup: equipment restored to Available after rental delete" ($eqFinal.data.availability -eq 'Available')
Invoke-RestMethod -Uri "$BASE/equipment/$eqId" -Method DELETE -Headers $H | Out-Null
Write-Output "Cleanup done."
Write-Output ("RESULT: " + $pass + " passed, " + $fail + " failed")
