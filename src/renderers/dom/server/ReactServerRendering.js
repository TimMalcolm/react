/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactServerRendering
 */
'use strict';

var ReactDOMContainerInfo = require('ReactDOMContainerInfo');
var ReactDefaultBatchingStrategy = require('ReactDefaultBatchingStrategy');
var ReactElement = require('ReactElement');
var ReactInstrumentation = require('ReactInstrumentation');
var ReactMarkupChecksum = require('ReactMarkupChecksum');
var ReactReconciler = require('ReactReconciler');
var ReactServerBatchingStrategy = require('ReactServerBatchingStrategy');
var ReactServerRenderingTransaction =
  require('ReactServerRenderingTransaction');
var ReactUpdates = require('ReactUpdates');

var emptyObject = require('emptyObject');
var instantiateReactComponent = require('instantiateReactComponent');
var invariant = require('invariant');

/**
 * @param {ReactElement} element
 * @return {string} the HTML markup
 */
function renderToStringImpl(element, makeStaticMarkup) {
  var transaction;
  try {
    ReactUpdates.injection.injectBatchingStrategy(ReactServerBatchingStrategy);

    transaction = ReactServerRenderingTransaction.getPooled(makeStaticMarkup);

    return transaction.perform(function() {
      if (__DEV__) {
        ReactInstrumentation.debugTool.onBeginFlush();
      }
      var componentInstance = instantiateReactComponent(element, true);
      var markup = ReactReconciler.mountComponent(
        componentInstance,
        transaction,
        null,
        ReactDOMContainerInfo(),
        emptyObject
      );
      if (__DEV__) {
        ReactInstrumentation.debugTool.onUnmountComponent(
          componentInstance._debugID
        );
        ReactInstrumentation.debugTool.onEndFlush();
      }
      if (!makeStaticMarkup) {
        markup = ReactMarkupChecksum.addChecksumToMarkup(markup);
      }
      return markup;
    }, null);
  } finally {
    ReactServerRenderingTransaction.release(transaction);
    // Revert to the DOM batching strategy since these two renderers
    // currently share these stateful modules.
    ReactUpdates.injection.injectBatchingStrategy(ReactDefaultBatchingStrategy);
  }
}

/**
 * Render a ReactElement to its initial HTML. This should only be used on the
 * server.
 * See https://facebook.github.io/react/docs/top-level-api.html#reactdomserver.rendertostring
 */
function renderToString(element) {
  invariant(
    ReactElement.isValidElement(element),
    'renderToString(): You must pass a valid ReactElement.'
  );
  return renderToStringImpl(element, false);
}

/**
 * Similar to renderToString, except this doesn't create extra DOM attributes
 * such as data-react-id that React uses internally.
 * See https://facebook.github.io/react/docs/top-level-api.html#reactdomserver.rendertostaticmarkup
 */
function renderToStaticMarkup(element) {
  invariant(
    ReactElement.isValidElement(element),
    'renderToStaticMarkup(): You must pass a valid ReactElement.'
  );
  return renderToStringImpl(element, true);
}

module.exports = {
  renderToString: renderToString,
  renderToStaticMarkup: renderToStaticMarkup,
};
