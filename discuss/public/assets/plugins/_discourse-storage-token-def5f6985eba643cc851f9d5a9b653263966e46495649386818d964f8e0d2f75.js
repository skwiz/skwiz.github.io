define("discourse/plugins/discourse-storage-token/discourse/initializers/storage-token", ["exports", "ember-addons/ember-computed-decorators", "discourse/lib/plugin-api"], function (_exports, _emberComputedDecorators, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    name: 'storage-token',
    initialize: function initialize(container) {
      var siteSettings = container.lookup('site-settings:main');
      var store = container.lookup('store:main');

      function main() {
        /* get_user_info */
        var http_request = new XMLHttpRequest();
        http_request.open('GET', '/session/current.json', true);

        http_request.onreadystatechange = function (evt) {
          if (4 != http_request.readyState) {
            return;
          }

          if (2 != parseInt(http_request.status / 100)) {
            console.error('current.json not found');
            /* logout */

            var logout = [{
              'url': 'https://storage.confais.org/drive/webman/logout.cgi',
              'method': 'GET',
              'fields': []
            }, {
              'url': 'https://storage.confais.org/moments/webman/logout.cgi',
              'method': 'GET',
              'fields': []
            }, {
              'url': 'https://storage.confais.org/photo/webapi/auth.php',
              'method': 'GET',
              'fields': [{
                'n': 'api',
                'v': 'SYNO.PhotoStation.Auth'
              }, {
                'n': 'version',
                'v': '1'
              }, {
                'n': 'method',
                'v': 'logout'
              }]
            }, {
              'url': 'https://storage.confais.org/file/webapi/auth.cgi',
              'method': 'GET',
              'fields': [{
                'n': 'api',
                'v': 'SYNO.API.Auth'
              }, {
                'n': 'version',
                'v': '2'
              }, {
                'n': 'method',
                'v': 'logout'
              }]
            }, {
              'url': 'https://confais.org/genealogy/logout.php',
              'method': 'GET',
              'fields': []
            }];
            external_login(logout);
            return;
          }

          try {
            var user = JSON.parse(http_request.responseText);
          } catch (e) {
            console.error('unable to parse json');
            return;
          }

          var logins = [];
          /* check if the user info is complete */

          if (undefined == user || undefined == user['current_user'] || undefined == user['current_user']['id'] || undefined == user['current_user']['custom_fields'] || undefined == user['current_user']['custom_fields']['storage_username'] || undefined == user['current_user']['custom_fields']['storage_password']) {
            console.log('not able to login on storage.confais.org');
          } else {
            var username = user['current_user']['custom_fields']['storage_username'];
            var password = user['current_user']['custom_fields']['storage_password'];
            logins.push({
              'url': 'https://storage.confais.org/drive/webman/login.cgi',
              'method': 'GET',
              'fields': [{
                'n': 'username',
                'v': username
              }, {
                'n': 'passwd',
                'v': password
              }]
            });
            logins.push({
              'url': 'https://storage.confais.org/moments/webman/login.cgi',
              'method': 'GET',
              'fields': [{
                'n': 'username',
                'v': username
              }, {
                'n': 'passwd',
                'v': password
              }]
            });
            logins.push({
              'url': 'https://storage.confais.org/photo/webapi/auth.php',
              'method': 'GET',
              'fields': [{
                'n': 'api',
                'v': 'SYNO.PhotoStation.Auth'
              }, {
                'n': 'version',
                'v': '1'
              }, {
                'n': 'method',
                'v': 'login'
              }, {
                'n': 'username',
                'v': username
              }, {
                'n': 'password',
                'v': password
              }]
            });
            logins.push({
              'url': 'https://storage.confais.org/file/webapi/auth.cgi',
              'method': 'GET',
              'fields': [{
                'n': 'api',
                'v': 'SYNO.API.Auth'
              }, {
                'n': 'version',
                'v': '2'
              }, {
                'n': 'method',
                'v': 'login'
              }, {
                'n': 'account',
                'v': username
              }, {
                'n': 'passwd',
                'v': password
              }, {
                'n': 'session',
                'v': 'FileStation'
              }]
            });
          }

          if (undefined == user || undefined == user['current_user'] || undefined == user['current_user']['id'] || undefined == user['current_user']['custom_fields'] || undefined == user['current_user']['custom_fields']['genealogy_username'] || undefined == user['current_user']['custom_fields']['genealogy_password']) {
            console.log('not able to login on confais.org/genealogy/');
          } else {
            var username = user['current_user']['custom_fields']['genealogy_username'];
            var password = user['current_user']['custom_fields']['genealogy_password'];
            logins.push( //           {'url': 'https://confais.org/genealogy/index.php?route=login&url=%2Fgenealogy%2F', 'method': 'POST', 'fields': [{'n': 'action', 'v': 'login'}, {'n': 'url', 'v': '/genealogy/'}, {'n': 'username', 'v': username}, {'n': 'password', 'v': password}] }
            {
              'url': 'https://confais.org/genealogy/login.php',
              'method': 'POST',
              'fields': [{
                'n': 'action',
                'v': 'login'
              }, {
                'n': 'url',
                'v': 'index.php?ged=family'
              }, {
                'n': 'username',
                'v': username
              }, {
                'n': 'password',
                'v': password
              }]
            });
          }

          external_login(logins);
          setInterval(function () {
            var keepalives = [{
              'url': 'https://storage.confais.org/drive/webapi/entry.cgi',
              'method': 'GET',
              'fields': [{
                'n': 'stop_when_error',
                'v': 'false'
              }, {
                'n': 'mode',
                'v': '"parallel"'
              }, {
                'n': 'compound',
                'v': '[{"api":"SYNO.Entry.Request","method":"request","version":1,"compound":[{"api":"SYNO.Core.Desktop.Timeout","version":1,"method":"check"}]},{"api":"SYNO.Entry.Request","method":"request","version":1,"compound":[{"api":"SYNO.Core.Desktop.Timeout","version":1,"method":"check"}]}]'
              }, {
                'n': 'api',
                'v': 'SYNO.Entry.Request'
              }, {
                'n': 'method',
                'v': 'request'
              }, {
                'n': 'version',
                'v': '1'
              }]
            }];
            external_login(keepalives);
          }, 60 * 1000);
        };

        http_request.send();
      }

      function external_login(params) {
        for (var i = 0; i < params.length; i++) {
          var params_ = params[i];
          var div = document.createElement('div');
          var suffix = Math.random().toString(36).substring(7);
          var iframe = document.createElement('iframe');
          iframe.setAttribute('name', 'external_login_frame_' + suffix);
          iframe.style.display = 'none';
          div.appendChild(iframe);
          var form = document.createElement('form');
          form.setAttribute('action', params_['url']);
          form.setAttribute('id', 'external_login_form_' + suffix);
          form.setAttribute('method', params_['method']);
          form.setAttribute('target', 'external_login_frame_' + suffix);

          for (var j = 0; j < params_['fields'].length; j++) {
            var input = document.createElement('input');
            input.setAttribute('type', 'hidden');
            input.setAttribute('name', params_['fields'][j]['n']);
            input.setAttribute('value', params_['fields'][j]['v']);
            form.appendChild(input);
          }

          div.appendChild(form);
          document.body.appendChild(div);
          document.getElementById('external_login_form_' + suffix).submit();

          (function (ddiv) {
            setTimeout(function () {
              document.body.removeChild(ddiv);
            }, 30 * 1000);
          })(div);
        }
      }

      $(document).ready(function () {
        main();
      });
    }
  };
  _exports.default = _default;
});

