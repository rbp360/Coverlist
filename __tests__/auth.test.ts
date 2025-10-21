import { hashPassword, verifyPassword } from '../lib/auth';

describe('auth password hashing', () => {
  it('hashes and verifies passwords', async () => {
    const pwd = 's3cret!';
    const hash = await hashPassword(pwd);
    expect(hash).not.toBe(pwd);
    await expect(verifyPassword(pwd, hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
