import type { RawBodyRequest } from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

export function toWebRequest(req: RawBodyRequest<ExpressRequest>): Request {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers))
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);

  return new Request(url, {
    method: req.method,
    headers,
    body: req.rawBody ? new Uint8Array(req.rawBody) : undefined,
  });
}

export async function sendWebResponse(
  res: ExpressResponse,
  webResponse: Response,
): Promise<void> {
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));
  const body = await webResponse.arrayBuffer();
  res.send(Buffer.from(body));
}
