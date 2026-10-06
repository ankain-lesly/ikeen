export async function GET() {
  return Response.json({ message: "Hello, world!", users: [], total: 0 });
}