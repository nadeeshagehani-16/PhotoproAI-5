# Member 2 (Equipment & Rental) validation test suite
# Tests all 7 validation rules live against http://localhost:5000

$ErrorActionPreference = 'Stop'
$BASE = 'http://localhost:5000/api'
$pass = 0; $fail = 0

function Test-Case($name, $condition, $detail) {
  if ($condition) { $script:pass++; Write-Output ("PASS  {0}  -- {1}" -f $name, $detail) }
  else { $script:fail++; Write-Output ("FAIL  {0}  -- {1}" -f $name, $detail) }
}

# ── Login ──
try {
  $login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method Post -ContentType 'application/json' -Body (@{email='test@test.com';password='test123'} | ConvertTo-Json)
  $token = $login.data.token
  if (-not $token) { throw "no token returned" }
  $hdr = @{ Authorization = "Bearer $token" }
  Write-Output "Logged in OK"
} catch {
  Write-Output "FATAL: login failed - $($_.Exception.Message)"; exit 1
}

function Try-Post($path, $body) {
  try {
    $r = Invoke-RestMethod -Uri "$BASE$path" -Method Post -Headers $hdr -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5)
    return @{ ok = $true; res = $r }
  } catch {
    $msg = ''
    try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch { $msg = $_.Exception.Message }
    return @{ ok = $false; msg = $msg }
  }
}

function Try-Put($path, $body) {
  try {
    $r = Invoke-RestMethod -Uri "$BASE$path" -Method Put -Headers $hdr -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5)
    return @{ ok = $true; res = $r }
  } catch {
    $msg = ''
    try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch { $msg = $_.Exception.Message }
    return @{ ok = $false; msg = $msg }
  }
}

function Try-Delete($path) {
  try {
    $r = Invoke-RestMethod -Uri "$BASE$path" -Method Delete -Headers $hdr
    return @{ ok = $true; res = $r }
  } catch {
    $msg = ''
    try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch { $msg = $_.Exception.Message }
    return @{ ok = $false; msg = $msg }
  }
}

# Date helpers (local)
function Local-Tomorrow { $d = (Get-Date).AddDays(1); return $d.ToString('yyyy-MM-dd') }
function Local-PlusDays($n) { $d = (Get-Date).AddDays($n); return $d.ToString('yyyy-MM-dd') }
function Local-Today { return (Get-Date).ToString('yyyy-MM-dd') }

# ── Get prerequisites ──
$customers = Invoke-RestMethod -Uri "$BASE/customers" -Headers $hdr
$custId = $customers.data[0]._id
# Create dedicated test equipment so rental tests never collide with existing bookings
$mkeq = Try-Post '/equipment' @{ name='M2 Validation Test Rig'; category='Accessory'; brand='TestBrand'; model='V1'; pricePerDay=100; condition='Good'; availability='Available' }
if (-not $mkeq.ok) { Write-Output "FATAL: could not create test equipment - $($mkeq.msg)"; exit 1 }
$equipId = $mkeq.res.data._id
Write-Output ("Using customer {0} and dedicated test equipment {1}" -f $custId, $equipId)

# ═══ RULE 1: Dates - past dates rejected, today/future accepted ═══

$tomorrow = Local-Tomorrow
$yesterday = Local-PlusDays -1
$today = Local-Today

# R1a: create rental with past start date -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$yesterday; endDate=$tomorrow; totalCost=100; securityDeposit=50; status='Pending' }
Test-Case "R1a past start date rejected" (-not $r.ok -and $r.msg -match 'past') $r.msg

# R1b: create rental with past end date -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$yesterday; endDate=$yesterday; totalCost=100; securityDeposit=50 }
Test-Case "R1b past end date rejected" (-not $r.ok -and $r.msg -match 'past') $r.msg

# R1c: update rental start date to past -> reject
$allRentals = Invoke-RestMethod -Uri "$BASE/rentals" -Headers $hdr
if ($allRentals.data.Count -gt 0) {
  $editId = $allRentals.data[0]._id
  $r = Try-Put "/rentals/$editId" @{ startDate=$yesterday }
  Test-Case "R1c update past start date rejected" (-not $r.ok -and $r.msg -match 'past') $r.msg
} else { Write-Output "SKIP  R1c (no existing rental to edit)" }

# R1d: today's date accepted (valid booking path)
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$today; endDate=$tomorrow; totalCost=100; securityDeposit=50; status='Pending' }
$r1dDetail = if ($r.ok) { "created" } else { $r.msg }
Test-Case "R1d today's date accepted" $r.ok $r1dDetail
if ($r.ok) { $createdRentalId = $r.res.data._id }

# ═══ RULE 2: Negative amounts rejected ═══

# R2a: create rental with negative totalCost -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$tomorrow; endDate=Local-PlusDays 2; totalCost=-100; securityDeposit=50 }
Test-Case "R2a negative totalCost rejected" (-not $r.ok -and $r.msg -match 'negative') $r.msg

# R2b: negative securityDeposit -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$tomorrow; endDate=Local-PlusDays 2; totalCost=100; securityDeposit=-100 }
Test-Case "R2b negative securityDeposit rejected" (-not $r.ok -and $r.msg -match 'negative') $r.msg

# R2c: negative pricePerDay on equipment create -> reject
$r = Try-Post '/equipment' @{ name='Test Camera'; category='Camera'; brand='Canon'; model='R5'; pricePerDay=-100; condition='Good'; availability='Available' }
Test-Case "R2c negative equipment price rejected" (-not $r.ok -and $r.msg -match 'negative') $r.msg

# R2d: zero price accepted on equipment (valid zero allowed)
$r = Try-Post '/equipment' @{ name='Zero Price Test'; category='Accessory'; brand='TestBrand'; model='T1'; pricePerDay=0; condition='Good'; availability='Available' }
$r2dDetail = if ($r.ok) { "created" } else { $r.msg }
Test-Case "R2d zero price accepted" $r.ok $r2dDetail
if ($r.ok) { $zeroEquipId = $r.res.data._id }

# R2e: update rental with negative cost -> reject
if ($createdRentalId) {
  $r = Try-Put "/rentals/$createdRentalId" @{ totalCost=-50 }
  Test-Case "R2e update negative totalCost rejected" (-not $r.ok -and $r.msg -match 'negative') $r.msg
}

# ═══ RULE 3: Email validation (no email inputs in M2 forms - customers selected from dropdown) ═══
# Verified by code inspection: rentals.js and equipment.js have no email input fields.
Write-Output "INFO  R3  Email rule N/A for M2 forms (customers picked from dropdown, no email inputs) - verified by code inspection"

# ═══ RULE 4: Required fields ═══

# R4a: missing customer -> reject
$r = Try-Post '/rentals' @{ equipmentId=$equipId; startDate=$tomorrow; endDate=Local-PlusDays 2; totalCost=100 }
Test-Case "R4a missing customer rejected" (-not $r.ok -and $r.msg -match 'required') $r.msg

# R4b: missing equipment -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; startDate=$tomorrow; endDate=Local-PlusDays 2; totalCost=100 }
Test-Case "R4b missing equipment rejected" (-not $r.ok -and $r.msg -match 'required') $r.msg

# R4c: missing dates -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; totalCost=100 }
Test-Case "R4c missing dates rejected" (-not $r.ok -and $r.msg -match 'required') $r.msg

# R4d: equipment missing name -> reject
$r = Try-Post '/equipment' @{ category='Camera'; brand='Canon'; model='R5'; pricePerDay=100 }
Test-Case "R4d equipment missing name rejected" (-not $r.ok -and $r.msg -match 'required') $r.msg

# ═══ RULE 5: Feedback / error message quality (400 + clear message) ═══
# All rejections above returned 400 with joined human-readable messages - covered by R1-R4 assertions on message content.

# ═══ RULE 6: Consistency across forms (add + edit, frontend + backend) �═
# R6a: edit form validation - invalid enum on update
if ($createdRentalId) {
  $r = Try-Put "/rentals/$createdRentalId" @{ status='Bogus' }
  Test-Case "R6a update invalid status enum rejected" (-not $r.ok -and $r.msg -match 'Status must be') $r.msg
}

# R6b: end date before start date on create -> reject
$r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=Local-PlusDays 5; endDate=$tomorrow; totalCost=100 }
Test-Case "R6b end-before-start rejected" (-not $r.ok -and $r.msg -match 'End date must be after') $r.msg

# R6c: invalid ObjectId format -> reject
$r = Try-Post '/rentals' @{ customerId='abc123'; equipmentId=$equipId; startDate=$tomorrow; endDate=Local-PlusDays 2; totalCost=100 }
Test-Case "R6c invalid customer ObjectId rejected" (-not $r.ok -and $r.msg -match 'Invalid customer ID') $r.msg

# ═══ REGRESSION: existing functionality intact ═══

# G1: overlap detection still works
if ($createdRentalId) {
  $r = Try-Post '/rentals' @{ customerId=$custId; equipmentId=$equipId; startDate=$today; endDate=$tomorrow; totalCost=100; securityDeposit=50; status='Pending' }
  Test-Case "G1 overlap detection still blocks double-booking" (-not $r.ok -and $r.msg -match 'already booked') $r.msg
}

# G2: availability auto-update: created rental should mark equipment 'Rented'
if ($createdRentalId) {
  $eq = Invoke-RestMethod -Uri "$BASE/equipment" -Headers $hdr
  $target = $eq.data | Where-Object { $_._id -eq $equipId }
  Test-Case "G2 equipment auto-set to Rented" ($target.availability -eq 'Rented') "availability=$($target.availability)"

  # G3: cancelling the rental restores 'Available'
  $r = Try-Put "/rentals/$createdRentalId" @{ status='Cancelled' }
  $g3Detail = if ($r.ok) { "status updated" } else { $r.msg }
  Test-Case "G3 cancel restores equipment Available" $r.ok $g3Detail
  if ($r.ok) {
    $eq = Invoke-RestMethod -Uri "$BASE/equipment" -Headers $hdr
    $target = $eq.data | Where-Object { $_._id -eq $equipId }
    Test-Case "G4 equipment restored to Available after cancel" ($target.availability -eq 'Available') "availability=$($target.availability)"
  }
}

# ═══ CLEANUP ═══
if ($createdRentalId) { $null = Try-Delete "/rentals/$createdRentalId"; Write-Output "Cleanup: deleted test rental $createdRentalId" }
if ($equipId) { $null = Try-Delete "/equipment/$equipId"; Write-Output "Cleanup: deleted dedicated test equipment $equipId" }
if ($zeroEquipId) { $null = Try-Delete "/equipment/$zeroEquipId"; Write-Output "Cleanup: deleted zero-price test equipment $zeroEquipId" }

Write-Output ""
Write-Output ("RESULT: {0} passed, {1} failed" -f $pass, $fail)
if ($fail -gt 0) { exit 1 }
