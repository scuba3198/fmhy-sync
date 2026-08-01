import assert from "node:assert/strict"
import test from "node:test"
import { parse } from "../src/BookmarkParser.res.mjs"
import { rebuild } from "../src/BookmarkWriter.res.mjs"
import { loadState, syncing } from "../src/Sync.res.mjs"

test("parses nested Netscape bookmark folders and links", () => {
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <DL><p>
      <DT><H3 ADD_DATE="1">Tools &amp; Stuff</H3>
      <DL><p>
        <DT><A HREF="https://example.com?a=1&amp;b=2">Example</A>
        <DT><H3>Nested</H3>
        <DL><p>
          <DT><A HREF='https://nested.example'>Nested link</A>
        </DL><p>
        <DT><A HREF="https://after.example">After nested</A>
      </DL><p>
    </DL><p>`

  const result = parse(html)
  assert.equal(result.TAG, "Ok")
  assert.equal(result._0.bookmarkCount, 3)
  assert.deepEqual(result._0.items, [
    {
      TAG: "Folder",
      _0: "Tools & Stuff",
      _1: [
        {TAG: "Link", _0: "Example", _1: "https://example.com?a=1&b=2"},
        {
          TAG: "Folder",
          _0: "Nested",
          _1: [{TAG: "Link", _0: "Nested link", _1: "https://nested.example"}]
        },
        {TAG: "Link", _0: "After nested", _1: "https://after.example"}
      ]
    }
  ])
})

test("rejects an export without links", () => {
  const result = parse("<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><H3>Empty</H3><DL><p></DL><p></DL>")
  assert.equal(result.TAG, "Error")
})

test("rejects ordinary HTML even when it contains links", () => {
  const result = parse("<html><body><a href=\"https://unexpected.example\">Continue</a></body></html>")
  assert.deepEqual(result, {
    TAG: "Error",
    _0: "The downloaded file was not a Netscape bookmark export."
  })
})

test("handles attribute boundaries and decodes entities once", () => {
  const result = parse(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <DL><p>
      <DT><A data-href="https://wrong.example" HREF=https://right.example\tADD_DATE="1">A &#38; B</A>
      <DT><A HREF="https://example.test/?a=&#38;b=&#x2F;path">Encoded</A>
    </DL><p>`)

  assert.equal(result.TAG, "Ok")
  assert.deepEqual(result._0.items, [
    {TAG: "Link", _0: "A & B", _1: "https://right.example"},
    {TAG: "Link", _0: "Encoded", _1: "https://example.test/?a=&b=/path"}
  ])
})

test("preserves folder names containing Unicode case-expanding characters", () => {
  const result = parse(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <DL><p>
      <DT><H3>Downloading / İndirme</H3>
      <DL><p>
        <DT><A HREF="https://example.com">Example</A>
      </DL><p>
    </DL><p>`)

  assert.equal(result.TAG, "Ok")
  assert.equal(result._0.items[0]._0, "Downloading / İndirme")
})

test("rejects unsupported bookmark URL schemes", () => {
  const result = parse(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <DL><p><DT><A HREF="javascript:alert(1)">Unsafe</A></DL><p>`)

  assert.deepEqual(result, {
    TAG: "Error",
    _0: "The downloaded export contained an unsupported bookmark URL."
  })
})

test("keeps the existing folder when a staged rebuild fails", async () => {
  const previousChrome = globalThis.chrome
  const calls = []

  globalThis.chrome = {
    bookmarks: {
      getChildren: async parentId => {
        calls.push(["getChildren", parentId])
        return parentId === "1" ? [{id: "old", title: "FMHY Starred"}] : []
      },
      removeTree: async id => {
        calls.push(["removeTree", id])
      },
      create: async details => {
        calls.push(["create", details])
        if (details.title === "FMHY Starred (syncing)") {
          return {id: "staging", title: details.title}
        }
        throw new Error("simulated bookmark write failure")
      },
      update: async () => {
        throw new Error("update should not run")
      }
    }
  }

  try {
    await assert.rejects(rebuild([{TAG: "Link", _0: "Example", _1: "https://example.com"}]))
  } finally {
    if (previousChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = previousChrome
    }
  }

  assert.deepEqual(calls.filter(([name]) => name === "removeTree"), [["removeTree", "staging"]])
  assert.equal(calls.some(([name, id]) => name === "removeTree" && id === "old"), false)
})

test("publishes a complete staged tree before removing the old folder", async () => {
  const previousChrome = globalThis.chrome
  const calls = []
  let getChildrenCalls = 0

  globalThis.chrome = {
    bookmarks: {
      getChildren: async parentId => {
        calls.push(["getChildren", parentId])
        getChildrenCalls += 1
        return getChildrenCalls === 1
          ? [{id: "old", title: "FMHY Starred"}]
          : [
              {id: "old", title: "FMHY Starred"},
              {id: "staging", title: "FMHY Starred"}
            ]
      },
      removeTree: async id => {
        calls.push(["removeTree", id])
      },
      create: async details => {
        calls.push(["create", details])
        if (details.title === "FMHY Starred (syncing)") {
          return {id: "staging", title: details.title}
        }
        return {id: "link", title: details.title, url: details.url}
      },
      update: async (id, details) => {
        calls.push(["update", id, details])
        return {id, title: details.title}
      }
    }
  }

  try {
    await rebuild([{TAG: "Link", _0: "Example", _1: "https://example.com"}])
  } finally {
    if (previousChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = previousChrome
    }
  }

  const removeOldIndex = calls.findIndex(([name, id]) => name === "removeTree" && id === "old")
  const updateIndex = calls.findIndex(([name]) => name === "update")
  assert.equal(updateIndex >= 0, true)
  assert.equal(removeOldIndex > updateIndex, true)
})

test("preserves the existing folder position during a rebuild", async () => {
  const previousChrome = globalThis.chrome
  const calls = []
  let stagingCreated = false

  globalThis.chrome = {
    bookmarks: {
      getChildren: async parentId => {
        calls.push(["getChildren", parentId])
        if (parentId !== "1") {
          return []
        }
        return stagingCreated
          ? [
              {id: "before", title: "Before"},
              {id: "staging", title: "FMHY Starred (syncing)"},
              {id: "old", title: "FMHY Starred"},
              {id: "after", title: "After"}
            ]
          : [
              {id: "before", title: "Before"},
              {id: "old", title: "FMHY Starred"},
              {id: "after", title: "After"}
            ]
      },
      removeTree: async id => {
        calls.push(["removeTree", id])
      },
      create: async details => {
        calls.push(["create", details])
        if (details.title === "FMHY Starred (syncing)") {
          stagingCreated = true
          assert.equal(details.index, 1)
          return {id: "staging", title: details.title}
        }
        return {id: "link", title: details.title, url: details.url}
      },
      update: async (id, details) => {
        calls.push(["update", id, details])
        return {id, title: details.title}
      }
    }
  }

  try {
    await rebuild([{TAG: "Link", _0: "Example", _1: "https://example.com"}])
  } finally {
    if (previousChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = previousChrome
    }
  }

  assert.deepEqual(calls.filter(([name]) => name === "removeTree"), [["removeTree", "old"]])
})

test("recovers a stale syncing state so the popup can retry", async () => {
  const previousChrome = globalThis.chrome
  const savedStates = []

  globalThis.chrome = {
    storage: {
      local: {
        get: async () => ({
          state: {
            status: "syncing",
            lastSuccessfulAt: 123,
            bookmarkCount: 7,
            syncStartedAt: Date.now() - 16 * 60 * 1000,
            message: "Downloading..."
          }
        }),
        set: async payload => {
          savedStates.push(payload.state)
        }
      }
    }
  }

  try {
    syncing.contents = false
    const state = await loadState()
    assert.equal(state.status, "error")
    assert.equal(state.bookmarkCount, 7)
    assert.equal(state.message, "The previous sync was interrupted. Try again.")
    assert.equal(savedStates.length, 1)
  } finally {
    if (previousChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = previousChrome
    }
  }
})
