define("discourse/lib/webauthn", ["exports", "I18n"], function (_exports, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.stringToBuffer = stringToBuffer;
  _exports.bufferToBase64 = bufferToBase64;
  _exports.isWebauthnSupported = isWebauthnSupported;
  _exports.getWebauthnCredential = getWebauthnCredential;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function stringToBuffer(str) {
    var buffer = new ArrayBuffer(str.length);
    var byteView = new Uint8Array(buffer);

    for (var i = 0; i < str.length; i++) {
      byteView[i] = str.charCodeAt(i);
    }

    return buffer;
  }

  function bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(String, _toConsumableArray(new Uint8Array(buffer))));
  }

  function isWebauthnSupported() {
    return typeof PublicKeyCredential !== "undefined";
  }

  function getWebauthnCredential(challenge, allowedCredentialIds, successCallback, errorCallback) {
    if (!isWebauthnSupported()) {
      return errorCallback(_I18n.default.t("login.security_key_support_missing_error"));
    }

    var challengeBuffer = stringToBuffer(challenge);
    var allowCredentials = allowedCredentialIds.map(function (credentialId) {
      return {
        id: stringToBuffer(atob(credentialId)),
        type: "public-key"
      };
    });
    navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        allowCredentials: allowCredentials,
        timeout: 60000,
        // see https://chromium.googlesource.com/chromium/src/+/master/content/browser/webauth/uv_preferred.md for why
        // default value of preferred is not necessarily what we want, it limits webauthn to only devices that support
        // user verification, which usually requires entering a PIN
        userVerification: "discouraged"
      }
    }).then(function (credential) {
      // 1. if there is a credential, check if the raw ID base64 matches
      // any of the allowed credential ids
      if (!allowedCredentialIds.some(function (credentialId) {
        return bufferToBase64(credential.rawId) === credentialId;
      })) {
        return errorCallback(_I18n.default.t("login.security_key_no_matching_credential_error"));
      }

      var credentialData = {
        signature: bufferToBase64(credential.response.signature),
        clientData: bufferToBase64(credential.response.clientDataJSON),
        authenticatorData: bufferToBase64(credential.response.authenticatorData),
        credentialId: bufferToBase64(credential.rawId)
      };
      successCallback(credentialData);
    }).catch(function (err) {
      if (err.name === "NotAllowedError") {
        return errorCallback(_I18n.default.t("login.security_key_not_allowed_error"));
      }

      errorCallback(err);
    });
  }
});
