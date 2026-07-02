(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AvatarUtils = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveAvatarSrc(userOrProfile, options = {}) {
    const fallback = options.fallback || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="12" fill="%23e5e7eb"/%3E%3Ccircle cx="32" cy="28" r="14" fill="%239ca3af"/%3E%3Cpath d="M16 56c3.5-12 12-18 16-18s12.5 6 16 18" fill="%239ca3af"/%3E%3C/svg%3E';
    const avatar = userOrProfile && typeof userOrProfile === 'object'
      ? userOrProfile.avatar_url || userOrProfile.avatar || userOrProfile.avatarUrl || userOrProfile.avatar_image_url || userOrProfile.avatar_image || null
      : null;

    if (avatar && String(avatar).trim()) {
      return avatar;
    }

    return fallback;
  }

  function applyAvatarFallback(imgElement, userOrProfile, options = {}) {
    if (!imgElement) {
      return;
    }

    const fallback = options.fallback || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="12" fill="%23e5e7eb"/%3E%3Ccircle cx="32" cy="28" r="14" fill="%239ca3af"/%3E%3Cpath d="M16 56c3.5-12 12-18 16-18s12.5 6 16 18" fill="%239ca3af"/%3E%3C/svg%3E';
    const src = resolveAvatarSrc(userOrProfile, { fallback });

    imgElement.setAttribute('src', src);
    imgElement.onerror = function handleAvatarError() {
      if (imgElement.getAttribute('src') !== fallback) {
        imgElement.setAttribute('src', fallback);
      }
    };
  }

  return {
    resolveAvatarSrc,
    applyAvatarFallback,
  };
}));
