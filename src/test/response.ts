export function createJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status })
}
