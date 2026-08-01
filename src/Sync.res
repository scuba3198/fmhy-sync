let exportUrl = "https://raw.githubusercontent.com/fmhy/bookmarks/main/fmhy_in_bookmarks_starred_only.html"
let syncing = ref(false)
let interruptedSyncAfterMs = 15.0 *. 60.0 *. 1000.0

let saveState = (state: Models.syncState): promise<Models.syncState> =>
  Chrome.Storage.set({state: state})
  ->Promise.then(_ => Promise.resolve(state))

let readState = (): promise<Models.syncState> =>
  Chrome.Storage.get()
  ->Promise.then(payload => switch payload.state {
    | Some(state) => Promise.resolve(state)
    | None => Promise.resolve(Models.defaultState)
  })
  ->Promise.catch(error => {
    ErrorLogger.log("Unable to read stored sync state; using defaults.", error)
    Promise.resolve(Models.defaultState)
  })

let isInterrupted = (state: Models.syncState): bool => {
  if state.status != "syncing" {
    false
  } else {
    switch state.syncStartedAt {
    | Some(startedAt) => Models.now() -. startedAt > interruptedSyncAfterMs
    | None => true
    }
  }
}

let loadState = (): promise<Models.syncState> =>
  readState()->Promise.then(state => {
    if syncing.contents || !isInterrupted(state) {
      Promise.resolve(state)
    } else {
      let recoveredState = {
        ...state,
        status: "error",
        syncStartedAt: None,
        message: "The previous sync was interrupted. Try again.",
      }
      saveState(recoveredState)->Promise.catch(error => {
        ErrorLogger.log("Unable to save the recovered sync state.", error)
        Promise.resolve(recoveredState)
      })
    }
  })

let finishState = (state: Models.syncState): promise<Models.syncState> =>
  saveState(state)->Promise.catch(error => {
    ErrorLogger.log("Unable to save sync state.", error)
    Promise.resolve(state)
  })

let fetchAndParse = (): promise<result<Models.parsedExport, string>> =>
  Chrome.Fetch.fetch(exportUrl)
  ->Promise.then(response => {
    if response.ok {
      Promise.resolve(BookmarkParser.parse(response.text))
    } else {
      Promise.resolve(Error("The public FMHY export could not be downloaded (HTTP " ++ Belt.Int.toString(response.status) ++ ")."))
    }
  })
  ->Promise.catch(error => {
    ErrorLogger.log("Unable to download the FMHY export.", error)
    Promise.resolve(Error("Could not download the FMHY export. Check your connection and try again."))
  })

let syncOnce = (): promise<Models.syncState> =>
  loadState()
  ->Promise.then(currentState => {
    let pendingState = {
      ...currentState,
      status: "syncing",
      syncStartedAt: Some(Models.now()),
      message: "Downloading the latest FMHY bookmarks…",
    }
    saveState(pendingState)
    ->Promise.then(_ => fetchAndParse())
    ->Promise.then(result => switch result {
      | Error(message) =>
        finishState({...pendingState, status: "error", syncStartedAt: None, message})
      | Ok(parsed) =>
        BookmarkWriter.rebuild(parsed.items)
        ->Promise.then(_ => finishState({
          status: "success",
          lastSuccessfulAt: Some(Models.now()),
          bookmarkCount: parsed.bookmarkCount,
          syncStartedAt: None,
          message: "Bookmarks synced successfully.",
        }))
    })
    ->Promise.catch(error => {
      ErrorLogger.log("Sync failed while updating browser bookmarks.", error)
      finishState({
        ...currentState,
        status: "error",
        syncStartedAt: None,
        message: "Sync failed while updating browser bookmarks.",
      })
    })
  })
  ->Promise.catch(error => {
    ErrorLogger.log("Unable to load state before starting sync.", error)
    readState()->Promise.then(state => finishState({
      ...state,
      status: "error",
      syncStartedAt: None,
      message: "Sync failed while updating browser bookmarks.",
    }))
  })

let run = (): promise<Models.syncState> => {
  if syncing.contents {
    readState()
  } else {
    syncing := true
    syncOnce()
    ->Promise.then(state => {
      syncing := false
      Promise.resolve(state)
    })
    ->Promise.catch(error => {
      ErrorLogger.log("Unexpected sync failure.", error)
      syncing := false
      readState()->Promise.then(state => finishState({
        ...state,
        status: "error",
        syncStartedAt: None,
        message: "Sync failed while updating browser bookmarks.",
      }))
    })
  }
}
