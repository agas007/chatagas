if ('serviceWorker' in navigator) {
  window.addEventListener('DOMContentLoaded', function () {
    const isLocalDev =
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (isLocalDev) {
      window._SW_ENABLED = false;
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        Promise.all(registrations.map((registration) => registration.unregister()))
          .then(() => caches.keys())
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .then(() => {
            console.log('ServiceWorker disabled in local development.');
          })
          .catch(function (err) {
            console.error('ServiceWorker cleanup failed:', err);
          });
      });
      return;
    }

    navigator.serviceWorker.register('/serviceWorker.js').then(function (registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
      const sw = registration.installing || registration.waiting
      if (sw) {
        sw.onstatechange = function() {
          if (sw.state === 'installed') {
            // SW installed.  Reload for SW intercept serving SW-enabled page.
            console.log('ServiceWorker installed reload page');
            window.location.reload();
          }
        }
      }
      registration.update().then(res => {
        console.log('ServiceWorker registration update: ', res);
      });
      window._SW_ENABLED = true
    }, function (err) {
      console.error('ServiceWorker registration failed: ', err);
    });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('ServiceWorker controllerchange ');
      window.location.reload(true);
    });
  });
}
