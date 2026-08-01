let prefix = "[FMHY Sync]"

let log = (context: string, error: exn): unit => {
  switch JsExn.fromException(error) {
  | Some(jsError) => Console.error2(prefix ++ " " ++ context, jsError)
  | None => Console.error2(prefix ++ " " ++ context, error)
  }
}

let logMessage = (context: string, message: string): unit => {
  Console.error(prefix ++ " " ++ context ++ ": " ++ message)
}
