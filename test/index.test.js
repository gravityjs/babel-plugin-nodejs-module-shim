import test from 'ava';

test('example', (t) => {
  const result = {
    a: 1,
  };
  const expect = {
    a: 1,
  };
  t.deepEqual(result, expect);
});
