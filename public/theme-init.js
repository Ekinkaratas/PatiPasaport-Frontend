(function () {
  try {
    var preference = null;
    try {
      preference = window.localStorage.getItem('pp.theme');
    } catch (error) {
      preference = null;
    }
    var theme = preference === 'light' ? 'light' : 'dark';
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute('content', theme === 'dark' ? '#0e1a33' : '#f4f6fa');
  } catch (error) {
    return;
  }
})();
