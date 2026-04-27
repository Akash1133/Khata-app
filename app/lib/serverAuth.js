import { headers } from 'next/headers';

export async function getUserId() {
  const headersList = await headers();
  const allHeaders = {};
  headersList.forEach((val, key) => allHeaders[key] = val);
  console.log('Headers received:', JSON.stringify(allHeaders, null, 2));
  return headersList.get('x-user-id');
}
