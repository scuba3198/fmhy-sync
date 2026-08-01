let targetFolderName = "FMHY Starred"
let stagingFolderName = "FMHY Starred (syncing)"
let bookmarksBarId = "1"

let isTargetFolder = (node: Chrome.Bookmarks.node): bool => switch node.url {
| None => node.title == targetFolderName
| Some(_) => false
}

let isStagingFolder = (node: Chrome.Bookmarks.node): bool => switch node.url {
| None => node.title == stagingFolderName
| Some(_) => false
}

let removeFolders = (
  children: array<Chrome.Bookmarks.node>,
  shouldRemove: Chrome.Bookmarks.node => bool,
): promise<unit> =>
  children
  ->Belt.Array.keep(shouldRemove)
  ->Belt.Array.reduce(Promise.resolve(()), (sequence, child) =>
    sequence->Promise.then(_ => Chrome.Bookmarks.removeTree(child.id))
  )

let removeExisting = (children: array<Chrome.Bookmarks.node>): promise<unit> =>
  removeFolders(children, isTargetFolder)

let removeExistingExcept = (children: array<Chrome.Bookmarks.node>, keepId: string): promise<unit> =>
  removeFolders(children, node => isTargetFolder(node) && node.id != keepId)

let removeStaging = (children: array<Chrome.Bookmarks.node>): promise<unit> =>
  removeFolders(children, isStagingFolder)

let targetIndex = (children: array<Chrome.Bookmarks.node>): option<int> =>
  children->Belt.Array.getIndexBy(isTargetFolder)

let createStagingFolder = (index: option<int>): promise<Chrome.Bookmarks.node> => switch index {
| Some(value) =>
    Chrome.Bookmarks.createFolderAtIndex({
      parentId: bookmarksBarId,
      title: stagingFolderName,
      index: value,
    })
| None => Chrome.Bookmarks.createFolder({parentId: bookmarksBarId, title: stagingFolderName})
}

let rec createItems = (parentId: string, items: array<Models.bookmark>): promise<unit> =>
  items->Belt.Array.reduce(Promise.resolve(()), (sequence, item) =>
    sequence->Promise.then(_ => switch item {
    | Models.Link(title, url) =>
      Chrome.Bookmarks.createLink({parentId, title, url})
      ->Promise.then(_ => Promise.resolve(()))
    | Models.Folder(title, children) =>
      Chrome.Bookmarks.createFolder({parentId, title})
      ->Promise.then(folder => createItems(folder.id, children))
    })
  )

let rebuild = (items: array<Models.bookmark>): promise<unit> =>
  Chrome.Bookmarks.getChildren(bookmarksBarId)
  ->Promise.then(children =>
    removeStaging(children)
    ->Promise.then(_ => Chrome.Bookmarks.getChildren(bookmarksBarId))
    ->Promise.then(children => createStagingFolder(targetIndex(children)))
    ->Promise.then(stagingFolder => {
        let replacementReady = ref(false)
        createItems(stagingFolder.id, items)
        ->Promise.then(_ =>
          Chrome.Bookmarks.update(stagingFolder.id, {title: targetFolderName})
          ->Promise.then(_ => {
            replacementReady := true
            Promise.resolve(())
          })
        )
        ->Promise.then(_ =>
          Chrome.Bookmarks.getChildren(bookmarksBarId)
          ->Promise.then(children => removeExistingExcept(children, stagingFolder.id))
        )
        ->Promise.catch(error => {
          ErrorLogger.log("Unable to rebuild FMHY bookmarks.", error)
          if replacementReady.contents {
            Promise.reject(error)
          } else {
            Chrome.Bookmarks.removeTree(stagingFolder.id)
            ->Promise.catch(cleanupError => {
              ErrorLogger.log("Unable to remove the failed staging folder.", cleanupError)
              Promise.resolve(())
            })
            ->Promise.then(_ => Promise.reject(error))
          }
        })
      })
  )
