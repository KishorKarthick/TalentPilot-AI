const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { runPreSave } = require('../helpers/hooks');

const validUser = (overrides = {}) => new User({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'secret123',
  ...overrides,
});

describe('User schema', () => {
  it('accepts a valid user and applies defaults', () => {
    const user = validUser();

    expect(user.validateSync()).toBeUndefined();
    expect(user.role).toBe('recruiter');
    expect(user.isActive).toBe(true);
  });

  it('requires name, email and password', () => {
    const errors = new User({}).validateSync().errors;

    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
  });

  it('lowercases the email and trims the name and company', () => {
    const user = validUser({ email: 'Ada@Example.COM', name: '  Ada  ', company: '  Acme  ' });

    expect(user.email).toBe('ada@example.com');
    expect(user.name).toBe('Ada');
    expect(user.company).toBe('Acme');
  });

  it('rejects a password shorter than 6 characters', () => {
    const error = validUser({ password: 'short' }).validateSync();

    expect(error.errors.password.kind).toBe('minlength');
  });

  it.each(['recruiter', 'admin', 'hiring_manager'])('allows the %s role', (role) => {
    expect(validUser({ role }).validateSync()).toBeUndefined();
  });

  it('rejects an unknown role', () => {
    const error = validUser({ role: 'ceo' }).validateSync();

    expect(error.errors.role.kind).toBe('enum');
  });
});

describe('User password hashing', () => {
  it('hashes the password before saving', async () => {
    const user = validUser();

    await runPreSave(user);

    expect(user.password).not.toBe('secret123');
    expect(user.password).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare('secret123', user.password)).toBe(true);
  });

  it('does not re-hash an unmodified password', async () => {
    const user = validUser();
    await runPreSave(user);
    const hashed = user.password;

    user.unmarkModified('password');
    user.name = 'Ada L.';
    await runPreSave(user);

    expect(user.password).toBe(hashed);
  });
});

describe('User methods', () => {
  it('matchPassword resolves true for the correct password and false otherwise', async () => {
    const user = validUser();
    await runPreSave(user);

    await expect(user.matchPassword('secret123')).resolves.toBe(true);
    await expect(user.matchPassword('wrong-password')).resolves.toBe(false);
  });

  it('toJSON omits the password hash', async () => {
    const user = validUser();
    await runPreSave(user);

    const json = user.toJSON();

    expect(json).not.toHaveProperty('password');
    expect(json.email).toBe('ada@example.com');
  });
});
