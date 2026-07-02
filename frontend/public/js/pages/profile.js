(function () {
  function initProfileAvatars() {
    if (typeof document === 'undefined') {
      return;
    }

    const avatarUtils = (typeof window !== 'undefined' && window.AvatarUtils) ? window.AvatarUtils : null;
    if (!avatarUtils) {
      return;
    }

    document.querySelectorAll('img[data-avatar-user], img.avatar, img.profile-avatar').forEach(function (imgElement) {
      const userData = imgElement.getAttribute('data-avatar-user');
      let user = null;

      if (userData) {
        try {
          user = JSON.parse(userData);
        } catch (error) {
          user = null;
        }
      }

      avatarUtils.applyAvatarFallback(imgElement, user, {
        fallback: imgElement.getAttribute('data-avatar-fallback') || undefined,
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileAvatars);
  } else {
    initProfileAvatars();
  }
}());
