export function redactToken(message: string, token: string) {
  return token.length === 0 ? message : message.replaceAll(token, '[REDACTED]')
}
