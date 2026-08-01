let weeklyAlarmName = "fmhy-weekly-sync"

let scheduleWeeklyAlarm = (): promise<unit> => {
  let createAlarm = () => {
    Chrome.Alarms.create(weeklyAlarmName, {
      delayInMinutes: Clock.minutesUntilNextMondayMorning(),
      periodInMinutes: 10080.0,
    })
    ->Promise.then(_ => Promise.resolve(()))
  }
  Chrome.Alarms.get(weeklyAlarmName)
  ->Promise.then(alarm => switch alarm {
    | Some(_) => Promise.resolve(())
    | None => createAlarm()
  })
  ->Promise.catch(error => {
    ErrorLogger.log("Unable to inspect the weekly sync alarm; attempting to create it.", error)
    createAlarm()
  })
  ->Promise.catch(error => {
    ErrorLogger.log("Unable to schedule the weekly sync alarm.", error)
    Promise.resolve(())
  })
}

let startSync = (): unit => {
  Sync.run()->ignore
}

Chrome.Runtime.addMessageListener((request, _, sendResponse) => {
  switch request.action {
  | "getState" => {
      Sync.loadState()
      ->Promise.then(state => {
        sendResponse({state: state})
        Promise.resolve(())
      })
      ->ignore
      true
    }
  | "syncNow" => {
      Sync.run()
      ->Promise.then(state => {
        sendResponse({state: state})
        Promise.resolve(())
      })
      ->ignore
      true
    }
  | _ => false
  }
})

Chrome.Runtime.addInstalledListener(details => {
  scheduleWeeklyAlarm()->ignore
  if details.reason == "install" {
    startSync()
  }
})

Chrome.Runtime.addStartupListener(() => {
  scheduleWeeklyAlarm()->ignore
})

Chrome.Alarms.addListener(alarm => {
  if alarm.name == weeklyAlarmName {
    startSync()
  }
})

scheduleWeeklyAlarm()->ignore
