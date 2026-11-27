import type { Request, Response } from 'express';
import { badRequest, unauthorized } from '../../lib/errors';
import { searchUsers } from '../../repositories/users.repo';
import { toUserSummary } from '../../services/dto';

export async function search(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 2) throw badRequest('Search for at least two characters');

  const rows = await searchUsers(query, req.auth.userId);
  res.json({ data: { users: rows.map(toUserSummary) } });
}
