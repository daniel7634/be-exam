import {getSessionCountByDay} from '../repo/session-repo';
import {getUserCount, getUsers} from '../repo/user-repo';

export async function getTotalSignedUp(): Promise<number> {
  return await getUserCount();
}

export async function getTotalSessionToday(): Promise<number> {
  return await getSessionCountByDay(1);
}

export async function getAverageSession(day: number): Promise<number> {
  if (day < 1) {
    return 0;
  }
  return parseFloat(((await getSessionCountByDay(day)) / day).toFixed(2));
}

export async function getUsersPagination(page: number) {
  const pageSize = 8;
  const skip = (page - 1) * pageSize;
  const totalCount = await getUserCount();
  const totalPages = Math.ceil(totalCount / pageSize);

  const users = await getUsers(skip, pageSize);

  return {
    totalCount,
    totalPages,
    users,
  };
}
