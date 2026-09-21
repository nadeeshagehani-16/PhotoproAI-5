$BASE = 'http://localhost:5000/api'
$lb = @{ email='test@test.com'; password='test123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body $lb -ContentType 'application/json'
$H = @{ Authorization = 'Bearer ' + $login.data.token }

Write-Output '=== Studio Bookings API ==='
$stb = Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method GET -Headers $H
Write-Output ('Count: ' + @($stb.data).Count)
foreach($b in @($stb.data)) {
  $studioName = if($b.studioId -and $b.studioId.name) { $b.studioId.name } else { 'NULL' }
  Write-Output ('  ID=' + $b._id + ' | Date=' + $b.date + ' | Studio=' + $studioName + ' | Purpose=' + $b.purpose + ' | ' + $b.startTime + '-' + $b.endTime + ' | Status=' + $b.status)
}

Write-Output ''
Write-Output '=== Studios API ==='
$studios = Invoke-RestMethod -Uri "$BASE/studios" -Method GET -Headers $H
foreach($s in @($studios.data)) {
  Write-Output ('  ID=' + $s._id + ' | Name=' + $s.name)
}

Write-Output ''
Write-Output '=== Available Slots Test ==='
if(@($studios.data).Count -gt 0) {
  $sid = @($studios.data)[0]._id
  $date = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
  try {
    $slotsUrl = "$BASE/studio-bookings/available-slots?studioId=$sid" + "&date=$date"
    $slots = Invoke-RestMethod -Uri $slotsUrl -Method GET -Headers $H
    Write-Output ('Slots API: ' + @($slots.data.availableSlots).Count + ' slots returned')
  } catch {
    Write-Output ('Slots API FAILED: ' + $_.Exception.Message)
  }
}

Write-Output ''
Write-Output '=== Create Test Booking ==='
if(@($studios.data).Count -gt 0) {
  $sid = @($studios.data)[0]._id
  $custs = Invoke-RestMethod -Uri "$BASE/customers" -Method GET -Headers $H
  $cid = @($custs.data)[0]._id
  $futureDate = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
  $body = @{
    studioId = $sid
    customerId = $cid
    date = $futureDate
    startTime = '10:00'
    endTime = '12:00'
    purpose = 'Calendar connection test'
    totalCost = 5000
    status = 'Confirmed'
  } | ConvertTo-Json
  try {
    $created = Invoke-RestMethod -Uri "$BASE/studio-bookings" -Method POST -Body $body -ContentType 'application/json' -Headers $H
    Write-Output ('Created OK: ID=' + $created.data._id + ' Date=' + $created.data.date)
    
    # Now update it
    $ubody = @{ purpose = 'Updated calendar test'; totalCost = 7000 } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$BASE/studio-bookings/$($created.data._id)" -Method PUT -Body $ubody -ContentType 'application/json' -Headers $H
    Write-Output ('Updated OK: Purpose=' + $updated.data.purpose + ' Cost=' + $updated.data.totalCost)
    
    # Delete it
    $del = Invoke-RestMethod -Uri "$BASE/studio-bookings/$($created.data._id)" -Method DELETE -Headers $H
    Write-Output ('Deleted OK: ' + $del.message)
  } catch {
    Write-Output ('FAILED: ' + $_.Exception.Message)
    try {
      $errStream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($errStream)
      $errBody = $reader.ReadToEnd()
      Write-Output ('Error body: ' + $errBody)
    } catch {}
  }
}
