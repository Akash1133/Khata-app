import { headers } from 'next/headers';

export async function getUserId() {
  const headersList = await headers();
  return headersList.get('x-user-id');
}
