(function () {
  'use strict';
  var paths = ['/', '/arena/', '/m2m/', '/coach/', '/news/'];
  function clean(path) { path = String(path || '/').split('?')[0].split('#')[0]; return path !== '/' && path.slice(-1) !== '/' ? path + '/' : path; }
  function direction(fromUrl, toUrl) {
    try {
      var from = paths.indexOf(clean(new URL(fromUrl, location.href).pathname));
      var to = paths.indexOf(clean(new URL(toUrl, location.href).pathname));
      if (from < 0 || to < 0 || from === to) return '';
      if (from === paths.length - 1 && to === 0) return 'next';
      if (from === 0 && to === paths.length - 1) return 'prev';
      return to > from ? 'next' : 'prev';
    } catch (e) { return ''; }
  }
  function addType(event, fromUrl, toUrl) {
    if (!event.viewTransition) return;
    var type = direction(fromUrl, toUrl);
    if (type) event.viewTransition.types.add(type);
  }
  window.addEventListener('pageswap', function (event) {
    if (event.activation && event.activation.entry) addType(event, location.href, event.activation.entry.url);
  });
  window.addEventListener('pagereveal', function (event) {
    var activation = window.navigation && window.navigation.activation;
    if (activation && activation.from && activation.entry) addType(event, activation.from.url, activation.entry.url);
  });
})();
