/**
 * Minimal, dependency-free WYSIWYG for the admin.
 * Enhances any <textarea data-wysiwyg> into a contenteditable rich-text area
 * with a small toolbar. The textarea keeps the HTML (synced on every change +
 * on submit), so the server just reads req.body.body as before.
 */
(function () {
  var tas = document.querySelectorAll('textarea[data-wysiwyg]');
  Array.prototype.forEach.call(tas, function (ta) {
    ta.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'gwa-editor';
    var bar = document.createElement('div');
    bar.className = 'gwa-editor__bar';
    var area = document.createElement('div');
    area.className = 'gwa-editor__area';
    area.setAttribute('contenteditable', 'true');
    area.innerHTML = ta.value || '<p></p>';

    function exec(cmd, val) { area.focus(); document.execCommand(cmd, false, val || null); sync(); }
    function sync() { ta.value = area.innerHTML.trim(); }

    var buttons = [
      { label: 'H2',      run: function () { exec('formatBlock', 'h2'); } },
      { label: 'H3',      run: function () { exec('formatBlock', 'h3'); } },
      { label: 'Text',    run: function () { exec('formatBlock', 'p'); } },
      { label: 'Bold',    run: function () { exec('bold'); } },
      { label: 'Italic',  run: function () { exec('italic'); } },
      { label: '• List',  run: function () { exec('insertUnorderedList'); } },
      { label: '1. List', run: function () { exec('insertOrderedList'); } },
      { label: 'Quote',   run: function () { exec('formatBlock', 'blockquote'); } },
      { label: 'Link',    run: function () { var u = prompt('Link URL (https://…):'); if (u) exec('createLink', u); } },
      { label: 'Unlink',  run: function () { exec('unlink'); } },
      { label: 'Clear',   run: function () { exec('removeFormat'); } }
    ];
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gwa-editor__btn';
      btn.textContent = b.label;
      /* mousedown preventDefault keeps the text selection while clicking a button */
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.addEventListener('click', b.run);
      bar.appendChild(btn);
    });

    area.addEventListener('input', sync);
    area.addEventListener('blur', sync);
    var form = ta.closest('form');
    if (form) form.addEventListener('submit', sync);

    wrap.appendChild(bar);
    wrap.appendChild(area);
    ta.parentNode.insertBefore(wrap, ta.nextSibling);
    sync();
  });
})();
