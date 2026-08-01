type date

@new
external fromTimestamp: float => date = "Date"

@val
external now: unit => float = "Date.now"

@send
external getDay: date => int = "getDay"

@send
external getDate: date => int = "getDate"

@send
external getTime: date => float = "getTime"

@send
external setDate: (date, int) => float = "setDate"

@send
external setHours: (date, int, int, int, int) => float = "setHours"

let minutesUntilNextMondayMorning = (): float => {
  let nowTimestamp = now()
  let target = fromTimestamp(nowTimestamp)
  ignore(setHours(target, 9, 0, 0, 0))
  let day = getDay(target)
  let daysUntilMonday = if day == 1 {
    0
  } else if day == 0 {
    1
  } else {
    8 - day
  }
  ignore(setDate(target, getDate(target) + daysUntilMonday))
  let targetTimestamp = getTime(target)
  let finalTimestamp = if targetTimestamp <= nowTimestamp {
    ignore(setDate(target, getDate(target) + 7))
    getTime(target)
  } else {
    targetTimestamp
  }
  let minutes = (finalTimestamp -. nowTimestamp) /. 60000.0
  minutes < 1.0 ? 1.0 : minutes
}
