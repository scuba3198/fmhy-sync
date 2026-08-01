type rec bookmark =
  | Folder(string, array<bookmark>)
  | Link(string, string)

type parsedExport = {
  items: array<bookmark>,
  bookmarkCount: int,
}

type syncState = {
  status: string,
  lastSuccessfulAt: option<float>,
  bookmarkCount: int,
  syncStartedAt: option<float>,
  message: string,
}

let defaultState: syncState = {
  status: "idle",
  lastSuccessfulAt: None,
  bookmarkCount: 0,
  syncStartedAt: None,
  message: "Ready to sync.",
}

@val
external now: unit => float = "Date.now"
