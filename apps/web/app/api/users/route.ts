export async function GET(request: Request) {
  return Response.json({ message: "Hello, world!", users: [], total: 0 });
}