// Default to the LIVE Paddle API — this is a live product on a live seller
// account. The previous sandbox default + a live API key produced a 403
// "forbidden" on every checkout (live key rejected by the sandbox host), so
// nobody could ever pay. Override with PADDLE_API_URL only for sandbox testing.
const PADDLE_API_URL =
  process.env.PADDLE_API_URL ?? "https://api.paddle.com";

export async function createPaddleTransaction(body: {
  items: { price_id: string; quantity: number }[];
  checkout?: { url: string };
  custom_data?: Record<string, string>;
}): Promise<{ id: string; checkout: { url: string | null } }> {
  const res = await fetch(`${PADDLE_API_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paddle API ${res.status}: ${text}`);
  }

  const json = await res.json() as { data: { id: string; checkout: { url: string } } };
  return json.data;
}
