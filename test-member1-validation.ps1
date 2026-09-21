# Member 1 validation test suite (Users, Customers, Auth)
$ErrorActionPreference = 'Continue'
$BASE = 'http://localhost:5000/api'
$pass = 0; $fail = 0

function Check($name, $cond) {
  if ($cond) { $script:pass++; Write-Output ("PASS: " + $name) }
  else { $script:fail++; Write-Output ("FAIL: " + $name) }
}

# Login as Admin
$loginBody = @{ email = 'test@test.com'; password = 'test123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $loginBody -ContentType 'application/json'
$H = @{ Authorization = 'Bearer ' + $login.data.token }
Write-Output ("Logged in as: " + $login.data.user.email + " (" + $login.data.user.role + ")")

# ---- AUTH ----
try {
  $b = @{ name='X'; email='bad#email@test.com'; password='test123' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body $b -ContentType 'application/json' | Out-Null
  Check "A1 register rejects email with #", $false
} catch { Check "A1 register rejects email with #" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='X'; email='bad$char@test.com'; password='test123' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body $b -ContentType 'application/json' | Out-Null
  Check "A2 register rejects email with $", $false
} catch { Check "A2 register rejects email with $" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='X'; email='ok@ok.com'; password='123' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body $b -ContentType 'application/json' | Out-Null
  Check "A3 register rejects short password", $false
} catch { Check "A3 register rejects short password" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ email='test#test.com'; password='test123' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $b -ContentType 'application/json' | Out-Null
  Check "A4 login rejects invalid email format", $false
} catch { Check "A4 login rejects invalid email format" ($_.Exception.Response.StatusCode.value__ -eq 400) }

# ---- CUSTOMERS ----
try {
  $b = @{ name='Test Cli'; email='cli#bad@test.com'; phone='0771234567' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/customers" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "C1 customer rejects email with #", $false
} catch { Check "C1 customer rejects email with #" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='Test Cli'; email='cli@test.com'; phone='0771234567'; spent='-500' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/customers" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "C2 customer rejects negative spent", $false
} catch { Check "C2 customer rejects negative spent" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='Test Cli'; email='cli@test.com'; phone='abc'; bookings='-2' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/customers" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "C3 customer rejects bad phone + negative bookings", $false
} catch { Check "C3 customer rejects bad phone + negative bookings" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ name='Kumudi Test Client'; email='kumudi.test.client@example.com'; phone='+94771234567'; address='123 Galle Road, Colombo'; notes='Test client' } | ConvertTo-Json
$cust = Invoke-RestMethod -Uri "$BASE/customers" -Method POST -Body $b -ContentType 'application/json' -Headers $H
$custId = $cust.data._id
Check "C4 valid customer created" ($cust.success -eq $true -and $custId)

try {
  $b = @{ name='Dup Cli'; email='kumudi.test.client@example.com'; phone='0771234567' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/customers" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "C5 customer rejects duplicate email", $false
} catch { Check "C5 customer rejects duplicate email" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ email='still#bad@example.com' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/customers/$custId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "C6 customer update rejects bad email", $false
} catch { Check "C6 customer update rejects bad email" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ name='Kumudi Test Client Updated'; address='456 Kandy Road, Colombo' } | ConvertTo-Json
$upd = Invoke-RestMethod -Uri "$BASE/customers/$custId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H
Check "C7 valid customer update" ($upd.success -eq $true)

# ---- USERS ----
try {
  $b = @{ name='Test Usr'; email='usr$bad@test.com'; password='test123'; role='Staff' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "U1 user rejects email with $", $false
} catch { Check "U1 user rejects email with $" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='Test Usr'; email='usr@test.com'; password='123'; role='Staff' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "U2 user rejects short password", $false
} catch { Check "U2 user rejects short password" ($_.Exception.Response.StatusCode.value__ -eq 400) }

try {
  $b = @{ name='Test Usr'; email='usr@test.com'; password='test123'; role='Manager' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "U3 user rejects invalid role", $false
} catch { Check "U3 user rejects invalid role" ($_.Exception.Response.StatusCode.value__ -eq 400) }

$b = @{ name='Kumudi Test User'; email='kumudi.test.user@example.com'; password='test123'; role='Staff'; phone='+94771234568' } | ConvertTo-Json
$usr = Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body $b -ContentType 'application/json' -Headers $H
$usrId = $usr.data._id
Check "U4 valid user created" ($usr.success -eq $true -and $usrId)

try {
  $b = @{ name='Dup Usr'; email='kumudi.test.user@example.com'; password='test123'; role='Staff' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body $b -ContentType 'application/json' -Headers $H | Out-Null
  Check "U5 user rejects duplicate email", $false
} catch { Check "U5 user rejects duplicate email" ($_.Exception.Response.StatusCode.value__ -eq 400) }

# Update user password then verify login works with the new password (hashing on update)
$b = @{ password='newpass456' } | ConvertTo-Json
$updU = Invoke-RestMethod -Uri "$BASE/users/$usrId" -Method PUT -Body $b -ContentType 'application/json' -Headers $H
Check "U6 user password update accepted" ($updU.success -eq $true)

try {
  $lb = @{ email='kumudi.test.user@example.com'; password='newpass456' } | ConvertTo-Json
  $l2 = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $lb -ContentType 'application/json'
  Check "U7 login works with updated (hashed) password" ($l2.success -eq $true)
} catch { Check "U7 login works with updated (hashed) password" $false }

# ---- CLEANUP ----
Invoke-RestMethod -Uri "$BASE/customers/$custId" -Method DELETE -Headers $H | Out-Null
Invoke-RestMethod -Uri "$BASE/users/$usrId" -Method DELETE -Headers $H | Out-Null
Write-Output "Cleanup done."
Write-Output ("RESULT: " + $pass + " passed, " + $fail + " failed")
