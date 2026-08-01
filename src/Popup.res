%%raw(`import "./styles.css"`)

module DateFormatter = {
  type date

  @new
  external fromTimestamp: float => date = "Date"

  @send
  external toLocaleString: date => string = "toLocaleString"
}

let statusLabel = (status: string): string => switch status {
| "syncing" => "Syncing"
| "success" => "Synced"
| "error" => "Attention"
| _ => "Ready"
}

let statusClass = (status: string): string => switch status {
| "syncing" => "status-pill status-pill-syncing"
| "success" => "status-pill status-pill-success"
| "error" => "status-pill status-pill-error"
| _ => "status-pill status-pill-idle"
}

let lastSyncLabel = (timestamp: option<float>): string => switch timestamp {
| Some(value) => DateFormatter.fromTimestamp(value)->DateFormatter.toLocaleString
| None => "No successful sync yet"
}

let noticeTitle = (status: string): string => switch status {
| "error" => "Sync needs attention"
| _ => "Automatic refresh"
}

let noticeCopy = (status: string, message: string): string => switch status {
| "idle" => "Runs each Monday morning, or whenever you choose."
| _ => message
}

@react.component
let make = () => {
  let (state, setState) = React.useState(() => Models.defaultState)
  let isSyncing = state.status == "syncing"

  let setMessageError = () => {
    setState(previous => {
      {
        ...previous,
        status: "error",
        syncStartedAt: None,
        message: "The sync service could not be reached. Try again.",
      }
    })
  }

  let applyResponse = (response: option<Chrome.Runtime.response>) => switch response {
  | Some(value) => setState(_ => value.state)
  | None => {
      ErrorLogger.logMessage("Unable to contact the background sync service", "No response was received.")
      setMessageError()
    }
  }

  let requestState = () => {
    Chrome.Runtime.sendMessage({action: "getState"}, applyResponse)
  }

  let syncNow = () => {
    setState(previous => {
      {
        ...previous,
        status: "syncing",
        message: "Starting sync...",
      }
    })
    Chrome.Runtime.sendMessage({action: "syncNow"}, applyResponse)
  }

  React.useEffect0(() => {
    requestState()
    None
  })

  <div className="popup-shell">
    <header className="popup-header">
      <div className="brand-lockup">
        <span className="brand-mark" ariaHidden=true></span>
        <div>
          <p className="brand-name">{React.string("FMHY / SYNC")}</p>
          <p className="brand-caption">{React.string("Local bookmark utility")}</p>
        </div>
      </div>
      <span className={statusClass(state.status)}>
        <span className="status-dot" ariaHidden=true></span>
        {React.string(statusLabel(state.status))}
      </span>
    </header>

    <main className="popup-main">
      <section className="hero-card">
        <span className="hero-rail" ariaHidden=true></span>
        <div className="hero-content">
          <p className="eyebrow">{React.string("Archive control")}</p>
          <h1>{React.string("Keep the library current.")}</h1>
          <p className="hero-copy">
            {React.string("Refresh the FMHY starred export and rebuild its folders in your bookmarks bar.")}
          </p>
          <button
            className="sync-button"
            type_="button"
            onClick={_ => syncNow()}
            disabled={isSyncing}
            ariaBusy={isSyncing}>
            <span>{React.string(isSyncing ? "Syncing..." : "Sync bookmarks")}</span>
            <span className="button-arrow" ariaHidden=true></span>
          </button>
        </div>
      </section>

      <section className="details-panel" ariaLabel="Sync details">
        <div className="detail-row">
          <div className="detail-label">
            <span className="detail-marker detail-marker-bookmark" ariaHidden=true></span>
            <span>{React.string("Bookmarks")}</span>
          </div>
          <p className="detail-value">{React.string(Belt.Int.toString(state.bookmarkCount))}</p>
        </div>
        <div className="detail-row">
          <div className="detail-label">
            <span className="detail-marker detail-marker-clock" ariaHidden=true></span>
            <span>{React.string("Last sync")}</span>
          </div>
          <p className="detail-value detail-value-muted">{React.string(lastSyncLabel(state.lastSuccessfulAt))}</p>
        </div>
      </section>

      <section className={state.status == "error" ? "notice-card notice-card-error" : "notice-card"} role="status" ariaLive=#polite>
        <span className="notice-icon" ariaHidden=true></span>
        <div>
          <p className="notice-title">{React.string(noticeTitle(state.status))}</p>
          <p className="notice-copy">{React.string(noticeCopy(state.status, state.message))}</p>
        </div>
      </section>

      <a
        className="source-link"
        href="https://raw.githubusercontent.com/fmhy/bookmarks/main/fmhy_in_bookmarks_starred_only.html"
        target="_blank"
        rel="noreferrer">
        <span>{React.string("Open public source")}</span>
        <span className="source-arrow" ariaHidden=true></span>
      </a>
    </main>

    <footer className="popup-footer">
      <span className="footer-rule" ariaHidden=true></span>
      <span>{React.string("Local-only. Nothing is uploaded.")}</span>
    </footer>
  </div>
}
