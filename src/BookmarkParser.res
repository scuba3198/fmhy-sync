type rec folderBuilder = {
  title: string,
  mutable children: array<nodeBuilder>,
}

and nodeBuilder =
  | Folder(folderBuilder)
  | Link(string, string)

@send
external indexOfFrom: (string, string, int) => int = "indexOf"

@send
external slice: (string, int, int) => string = "slice"

@send
external trim: string => string = "trim"

@send
external toLowerCase: string => string = "toLowerCase"

@send
external startsWith: (string, string) => bool = "startsWith"

@val
external parseInt: (string, int) => int = "parseInt"

@val
external fromCodePoint: int => string = "String.fromCodePoint"

%%raw(`
function lowerAsciiText(value) {
  return value.replace(/[A-Z]/g, character => character.toLowerCase())
}
`)

@val
external lowerAsciiText: string => string = "lowerAsciiText"

let lowerAscii = (value: string): string => lowerAsciiText(value)

let isWhitespace = (value: string): bool =>
  value == " " || value == "\n" || value == "\r" || value == "\t"

let isAttributeBoundary = (value: string): bool =>
  isWhitespace(value) || value == "=" || value == ">" || value == "/"

let skipWhitespace = (value: string, start: int): int => {
  let position = ref(start)
  let length = String.length(value)
  while position.contents < length && isWhitespace(slice(value, position.contents, position.contents + 1)) {
    position := position.contents + 1
  }
  position.contents
}

let isDecimalDigit = (value: string): bool => switch value {
| "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" => true
| _ => false
}

let isHexDigit = (value: string): bool => switch value {
| "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
| "a" | "b" | "c" | "d" | "e" | "f"
| "A" | "B" | "C" | "D" | "E" | "F" => true
| _ => false
}

let allCharsMatch = (value: string, predicate: string => bool): bool => {
  let position = ref(0)
  let matches = ref(true)
  let length = String.length(value)
  while position.contents < length && matches.contents {
    if !predicate(slice(value, position.contents, position.contents + 1)) {
      matches := false
    }
    position := position.contents + 1
  }
  matches.contents
}

let decodeNumericEntity = (entity: string, digits: string, radix: int): string => {
  let validDigits = digits != "" && allCharsMatch(digits, radix == 16 ? isHexDigit : isDecimalDigit)
  if !validDigits {
    entity
  } else {
    let codePoint = parseInt(digits, radix)
    codePoint >= 0 && codePoint <= 1114111 ? fromCodePoint(codePoint) : entity
  }
}

let decodeEntity = (entity: string): string => {
  let length = String.length(entity)
  if entity == "&amp;" {
    "&"
  } else if entity == "&quot;" {
    "\""
  } else if entity == "&#39;" || entity == "&#x27;" || entity == "&#X27;" || entity == "&apos;" {
    "'"
  } else if entity == "&lt;" {
    "<"
  } else if entity == "&gt;" {
    ">"
  } else if entity == "&nbsp;" {
    fromCodePoint(160)
  } else if startsWith(entity, "&#x") || startsWith(entity, "&#X") {
    decodeNumericEntity(entity, slice(entity, 3, length - 1), 16)
  } else if startsWith(entity, "&#") {
    decodeNumericEntity(entity, slice(entity, 2, length - 1), 10)
  } else {
    entity
  }
}

let decodeEntities = (value: string): string => {
  let output = ref("")
  let cursor = ref(0)
  let length = String.length(value)
  while cursor.contents < length {
    let ampersand = indexOfFrom(value, "&", cursor.contents)
    if ampersand < 0 {
      output := output.contents ++ slice(value, cursor.contents, length)
      cursor := length
    } else {
      output := output.contents ++ slice(value, cursor.contents, ampersand)
      let semicolon = indexOfFrom(value, ";", ampersand + 1)
      if semicolon < 0 {
        output := output.contents ++ slice(value, ampersand, length)
        cursor := length
      } else {
        let entity = slice(value, ampersand, semicolon + 1)
        output := output.contents ++ decodeEntity(entity)
        cursor := semicolon + 1
      }
    }
  }
  output.contents
}

let cleanText = (value: string): string => value->trim->decodeEntities

let findAttributeStart = (tag: string, name: string): int => {
  let lowerTag = tag->lowerAscii
  let lowerName = name->lowerAscii
  let nameLength = String.length(lowerName)
  let length = String.length(lowerTag)
  let position = ref(0)
  let found = ref(-1)
  while position.contents < length && found.contents < 0 {
    let candidate = indexOfFrom(lowerTag, lowerName, position.contents)
    if candidate < 0 {
      position := length
    } else {
      let before = candidate == 0 ? "" : slice(lowerTag, candidate - 1, candidate)
      let afterPosition = candidate + nameLength
      let after = afterPosition >= length ? "" : slice(lowerTag, afterPosition, afterPosition + 1)
      if (candidate == 0 || isAttributeBoundary(before)) && (after == "=" || isAttributeBoundary(after)) {
        found := candidate
      } else {
        position := candidate + 1
      }
    }
  }
  found.contents
}

let findUnquotedValueEnd = (tag: string, start: int): int => {
  let position = ref(start)
  let end = ref(-1)
  let length = String.length(tag)
  while position.contents < length && end.contents < 0 {
    let character = slice(tag, position.contents, position.contents + 1)
    if isWhitespace(character) || character == ">" {
      end := position.contents
    } else {
      position := position.contents + 1
    }
  }
  end.contents < 0 ? length - 1 : end.contents
}

let attribute = (tag: string, name: string): option<string> => {
  let lowerTag = tag->lowerAscii
  let lowerName = name->lowerAscii
  let attributeStart = findAttributeStart(tag, name)
  if attributeStart < 0 {
    None
  } else {
    let nameEnd = attributeStart + String.length(lowerName)
    let equalSign = indexOfFrom(lowerTag, "=", nameEnd)
    if equalSign < 0 || tag->slice(nameEnd, equalSign)->trim != "" {
      None
    } else {
      let valueStart = skipWhitespace(tag, equalSign + 1)
      if valueStart >= String.length(tag) || slice(tag, valueStart, valueStart + 1) == ">" {
        None
      } else {
        let quote = slice(tag, valueStart, valueStart + 1)
        if quote == "\"" || quote == "'" {
          let valueEnd = indexOfFrom(tag, quote, valueStart + 1)
          valueEnd < 0
            ? None
            : Some(slice(tag, valueStart + 1, valueEnd)->decodeEntities)
        } else {
          let valueEnd = findUnquotedValueEnd(tag, valueStart)
          Some(slice(tag, valueStart, valueEnd)->decodeEntities)
        }
      }
    }
  }
}

let isSupportedUrl = (url: string): bool => {
  let normalized = url->trim->lowerAscii
  startsWith(normalized, "http://") || startsWith(normalized, "https://")
}

let append = (folder: folderBuilder, item: nodeBuilder): unit => {
  folder.children = Belt.Array.concat(folder.children, [item])
}

let currentFolder = (stack: array<folderBuilder>): folderBuilder => {
  switch Belt.Array.get(stack, Belt.Array.length(stack) - 1) {
  | Some(folder) => folder
  | None => {title: "", children: []}
  }
}

let rec freeze = (node: nodeBuilder): Models.bookmark => switch node {
| Folder(folder) => Models.Folder(folder.title, folder.children->Belt.Array.map(freeze))
| Link(title, url) => Models.Link(title, url)
}

let rec countLinks = (node: nodeBuilder): int => switch node {
| Link(_, _) => 1
| Folder(folder) => folder.children->Belt.Array.reduce(0, (count, child) => count + countLinks(child))
}

let parse = (html: string): result<Models.parsedExport, string> => {
  let root: folderBuilder = {title: "", children: []}
  let stack = ref([root])
  let pendingFolder = ref(None)
  let lowerHtml = html->lowerAscii
  let cursor = ref(0)
  let htmlLength = String.length(html)
  let invalidUrl = ref(false)

  while cursor.contents < htmlLength {
    let openTag = indexOfFrom(html, "<", cursor.contents)
    if openTag < 0 {
      cursor := htmlLength
    } else {
      let close = indexOfFrom(html, ">", openTag + 1)
      if close < 0 {
        cursor := htmlLength
      } else {
        let tag = slice(html, openTag, close + 1)
        let lowerTag = tag->toLowerCase
        if startsWith(lowerTag, "<h3") {
          let closingTag = indexOfFrom(lowerHtml, "</h3", close + 1)
          let titleEnd = closingTag < 0 ? close + 1 : closingTag
          let folderTitle = cleanText(slice(html, close + 1, titleEnd))
          let folder: folderBuilder = {
            title: folderTitle == "" ? "Untitled folder" : folderTitle,
            children: [],
          }
          append(currentFolder(stack.contents), Folder(folder))
          pendingFolder := Some(folder)
          if closingTag < 0 {
            cursor := close + 1
          } else {
            let closingEnd = indexOfFrom(lowerHtml, ">", closingTag + 4)
            cursor := (closingEnd < 0 ? close + 1 : closingEnd + 1)
          }
        } else if startsWith(lowerTag, "<a") {
          let closingTag = indexOfFrom(lowerHtml, "</a", close + 1)
          let titleEnd = closingTag < 0 ? close + 1 : closingTag
          let title = cleanText(slice(html, close + 1, titleEnd))
          let nextCursor = if closingTag < 0 {
            close + 1
          } else {
            let closingEnd = indexOfFrom(lowerHtml, ">", closingTag + 3)
            closingEnd < 0 ? close + 1 : closingEnd + 1
          }
          switch attribute(tag, "href") {
          | Some(rawUrl) => {
              let url = rawUrl->trim
              if url == "" {
                ()
              } else if isSupportedUrl(url) {
                append(currentFolder(stack.contents), Link(title, url))
              } else {
                invalidUrl := true
              }
            }
          | None => ()
          }
          cursor := nextCursor
        } else if startsWith(lowerTag, "<dl") {
          switch pendingFolder.contents {
          | Some(folder) => {
              stack := Belt.Array.concat(stack.contents, [folder])
              pendingFolder := None
            }
          | None => ()
          }
          cursor := close + 1
        } else if startsWith(lowerTag, "</dl") {
          if Belt.Array.length(stack.contents) > 1 {
            stack := Belt.Array.slice(
              stack.contents,
              ~offset=0,
              ~len=Belt.Array.length(stack.contents) - 1,
            )
          }
          pendingFolder := None
          cursor := close + 1
        } else {
          cursor := close + 1
        }
      }
    }
  }

  let items = root.children->Belt.Array.map(freeze)
  let bookmarkCount = root.children->Belt.Array.reduce(0, (count, child) => count + countLinks(child))
  let hasNetscapeHeader = indexOfFrom(lowerHtml, "<!doctype netscape-bookmark-file-1", 0) >= 0
  if !hasNetscapeHeader {
    Error("The downloaded file was not a Netscape bookmark export.")
  } else if invalidUrl.contents {
    Error("The downloaded export contained an unsupported bookmark URL.")
  } else if bookmarkCount == 0 {
    Error("The downloaded export did not contain any bookmarks.")
  } else {
    Ok({items, bookmarkCount})
  }
}
