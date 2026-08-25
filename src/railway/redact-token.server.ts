export function redactRailwayToken(message: string, token: string) {
  return message.replaceAll(token, '[REDACTED]')
}
