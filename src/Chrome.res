module Fetch = {
  type response = {
    ok: bool,
    status: int,
    text: string,
  }

  %%raw(`
  async function fetchWithTimeout(url) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const response = await globalThis.fetch(url, {signal: controller.signal})
      return {
        ok: response.ok,
        status: response.status,
        text: response.ok ? await response.text() : "",
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }
  `)

  @val
  external fetchWithTimeout: string => promise<response> = "fetchWithTimeout"

  let fetch = (url: string): promise<response> => fetchWithTimeout(url)
}

module Storage = {
  type getPayload = {
    state: option<Models.syncState>,
  }

  type setPayload = {
    state: Models.syncState,
  }

  @val @scope("chrome.storage.local")
  external get: unit => promise<getPayload> = "get"

  @val @scope("chrome.storage.local")
  external set: setPayload => promise<unit> = "set"
}

module Bookmarks = {
  type node = {
    id: string,
    title: string,
    url: option<string>,
  }

  type folderDetails = {
    parentId: string,
    title: string,
  }

  type indexedFolderDetails = {
    parentId: string,
    title: string,
    index: int,
  }

  type linkDetails = {
    parentId: string,
    title: string,
    url: string,
  }

  type updateDetails = {
    title: string,
  }

  @val @scope("chrome.bookmarks")
  external getChildren: string => promise<array<node>> = "getChildren"

  @val @scope("chrome.bookmarks")
  external createFolder: folderDetails => promise<node> = "create"

  @val @scope("chrome.bookmarks")
  external createFolderAtIndex: indexedFolderDetails => promise<node> = "create"

  @val @scope("chrome.bookmarks")
  external createLink: linkDetails => promise<node> = "create"

  @val @scope("chrome.bookmarks")
  external update: (string, updateDetails) => promise<node> = "update"

  @val @scope("chrome.bookmarks")
  external removeTree: string => promise<unit> = "removeTree"
}

module Runtime = {
  type request = {
    action: string,
  }

  type response = {
    state: Models.syncState,
  }

  type installDetails = {
    reason: string,
  }

  @val @scope("chrome.runtime")
  external sendMessage: (request, option<response> => unit) => unit = "sendMessage"

  @val @scope("chrome.runtime.onMessage")
  external addMessageListener: ((request, JSON.t, response => unit) => bool) => unit = "addListener"

  @val @scope("chrome.runtime.onInstalled")
  external addInstalledListener: (installDetails => unit) => unit = "addListener"

  @val @scope("chrome.runtime.onStartup")
  external addStartupListener: (unit => unit) => unit = "addListener"
}

module Alarms = {
  type alarm = {
    name: string,
  }

  type createInfo = {
    delayInMinutes: float,
    periodInMinutes: float,
  }

  @val @scope("chrome.alarms")
  external get: string => promise<option<alarm>> = "get"

  @val @scope("chrome.alarms")
  external create: (string, createInfo) => promise<unit> = "create"

  @val @scope("chrome.alarms.onAlarm")
  external addListener: (alarm => unit) => unit = "addListener"
}
