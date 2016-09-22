/* globals manifest, background */
'use strict';

function html (tag, attrs, parent) {
  attrs = attrs || {};
  tag = document.createElement(tag);
  for (var i in attrs) {
    tag.setAttribute(i, attrs[i]);
  }
  if (parent) {
    parent.appendChild(tag);
  }
  return tag;
}

var iframe = (function () {
  var ids = [], frm;
  var code =
    '<html>' +
    '  <head>' +
    '    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">' +
    '    <link rel="stylesheet" type="text/css" href="iframe.css">' +
    '  </head>' +
    '  <body>' +
    '    <div id="item" class="item" type="queue" style="display:none;">' +
    '      <div class="icon"></div>' +
    '      <div class="report">report</div>' +
    '      <div class="url"><a target="_blank">link</a></div>' +
    '      <div class="result"><a target="_blank">-</a></div>' +
    '      <div class="icon" type="close"></div>' +
    '    </div>' +
    '    <script src="iframe.js"></script>' +
    '  </body>' +
    '</html>';
  code = code.replace('iframe.js', manifest.url + 'content_script/iframe.js');
  code = code.replace('iframe.css', manifest.url + 'content_script/iframe.css');

  function height () {
    frm.style.height = (ids.length * 34 + 22) + 'px';
    frm.style.display = ids.length ? 'block' : 'none';
  }

  return {
    initiate: function (callback) {
      if (frm) {
        callback();
      }
      else {
        frm = html('iframe', {
          style: 'display: none; overflow: hidden; position: fixed; background-color: transparent; bottom: 0; left: 10%; width: 80%; z-index: 2147483647; border: none;',
          src: 'data:text/html;base64,' + btoa(code)
        }, document.body);
        frm.addEventListener('load', function () {
          if (callback) {
            callback();
          }
        });
      }
    },
    unload: function () {
      if (frm && frm.parentNode) {
        frm.parentNode.removeChild(frm);
      }
    },
    insert: function (id, callback) {
      this.initiate(function () {
        ids.push(id);
        height();
        if (callback) {
          callback();
        }
      });
    },
    remove: function (id) {
      id = +id;
      var index = ids.indexOf(id);
      if (index !== -1) {
        ids.splice(index, 1);
      }
      height();
    },
    get obj () {
      return frm;
    }
  };
})();

if (window.top === window && (document.contentType === 'text/html' || typeof safari !== 'undefined')) {
  // message passing
  window.addEventListener('message', function (e) {
    if (e.data && e.data.command && e.data.from && e.data.from === 'security-plus') {
      switch (e.data.command) {
        case 'remove-item':
          iframe.remove(e.data.id);
          background.send('removed-item', e.data.id);
          break;
      }
    }
  }, false);

  background.receive('insert-item', function (obj) {
    iframe.insert(obj.id, function () {
      obj.from = 'security-plus';
      obj.command = 'insert-item';
      if (iframe.obj.contentWindow) {
        iframe.obj.contentWindow.postMessage(obj, '*');
      }
    });
  });
  background.receive('update-item', function (obj) {
    obj.from = 'security-plus';
    obj.command = 'update-item';
    if (iframe.obj && iframe.obj.contentWindow) {
      iframe.obj.contentWindow.postMessage(obj, '*');
    }
  });
}
