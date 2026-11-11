/* Android native shim: file downloads (blob links, jsPDF.save) -> save + share sheet */
(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onloadend = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function saveAndShare(href, name) {
    try {
      var P = cap.Plugins;
      var blob = await (await fetch(href)).blob();
      var data = await blobToBase64(blob);
      var fileName = (name || 'quizbot_file').replace(/[\\/:*?"<>|]/g, '_');
      var out = await P.Filesystem.writeFile({ path: fileName, data: data, directory: 'CACHE' });
      await P.Share.share({ title: fileName, url: out.uri, dialogTitle: 'Save / Share: ' + fileName });
    } catch (e) {
      if (e && /cancel/i.test(String(e.message || e))) return;
      alert('File save nahi ho payi: ' + (e && e.message ? e.message : e));
    }
  }

  function isDownload(a) {
    return a instanceof HTMLAnchorElement && a.hasAttribute('download') &&
      /^(blob:|data:)/.test(a.href);
  }

  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isDownload(this)) { saveAndShare(this.href, this.getAttribute('download')); return; }
    return origClick.apply(this, arguments);
  };

  var origDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (ev && ev.type === 'click' && isDownload(this)) {
      saveAndShare(this.href, this.getAttribute('download'));
      return true;
    }
    return origDispatch.apply(this, arguments);
  };

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && isDownload(a)) { e.preventDefault(); saveAndShare(a.href, a.getAttribute('download')); }
  }, true);
})();
