
const crypto = require('node:crypto');

const password = process.argv[2];

if (!password || password.length < 14) {
  console.error(
    'Password must contain at least 14 characters.'
  );

  process.exit(1);
}

const salt = crypto.randomBytes(16);

crypto.scrypt(
  password,
  salt,
  64,
  {
    N: 32768,
    r: 8,
    p: 1
  },
  (error, key) => {
    if (error) throw error;

    console.log(
      [
        'scrypt',
        '32768',
        '8',
        '1',
        salt.toString('hex'),
        key.toString('hex')
      ].join('$')
    );
  }
);

