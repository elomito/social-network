const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAvatarSrc, applyAvatarFallback } = require('./avatar');

test('resolveAvatarSrc returns the avatar when present', () => {
  const avatar = { avatar_url: '/uploads/avatars/user.png' };
  assert.equal(resolveAvatarSrc(avatar), '/uploads/avatars/user.png');
});

test('resolveAvatarSrc falls back when no avatar exists', () => {
  const fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"></svg>';
  assert.equal(resolveAvatarSrc(null, { fallback }), fallback);
  assert.equal(resolveAvatarSrc(undefined, { fallback }), fallback);
});

test('applyAvatarFallback updates the image element source', () => {
  const element = { src: '', setAttribute(name, value) { this[name] = value; }, getAttribute(name) { return this[name]; }, onerror: null };
  applyAvatarFallback(element, { avatar_url: '/uploads/avatars/user.png' });
  assert.equal(element.src, '/uploads/avatars/user.png');
});
