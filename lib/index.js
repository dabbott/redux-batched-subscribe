// A copy & paste combination of:
//
// Allowing listening to store changes to batch updates to all listeners
// https://github.com/tappleby/redux-batched-subscribe
//
// Batch updates via batchActions([ ...actions ])
// https://github.com/abc123s/redux-batch-enhancer

'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.batchActions = batchActions;
exports.batchMiddleware = batchMiddleware;
exports.batchedSubscribe = batchedSubscribe;
var BATCH = 'ENHANCED_BATCHING.BATCH';
exports.BATCH = BATCH;
var PUSH = 'ENHANCED_BATCHING.PUSH';
exports.PUSH = PUSH;
var POP = 'ENHANCED_BATCHING.POP';

exports.POP = POP;

function batchActions(actions) {
  return { type: BATCH, payload: actions };
}

function batchMiddleware(_ref) {
  var dispatch = _ref.dispatch;

  return function (next) {
    return function (action) {
      switch (action.type) {
        case BATCH:
          {
            var _ret = (function () {
              dispatch({ type: PUSH });
              var returnArray = [];
              action.payload.forEach(function (batchedAction) {
                returnArray.push(dispatch(batchedAction));
              });
              dispatch({ type: POP });
              return {
                v: returnArray
              };
            })();

            if (typeof _ret === 'object') return _ret.v;
          }
        default:
          {
            return next(action);
          }
      }
    };
  };
}

function batchedSubscribe(batch) {
  if (typeof batch !== 'function') {
    throw new Error('Expected batch to be a function.');
  }

  var currentListeners = [];
  var nextListeners = currentListeners;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  function notifyListeners() {
    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  }

  function notifyListenersBatched() {
    batch(notifyListeners);
  }

  return function (next) {
    return function () {
      var store = next.apply(undefined, arguments);
      var subscribeImmediate = store.subscribe;

      var batchDepth = 0;
      var actionCount = 0;
      function dispatch() {
        for (var _len = arguments.length, dispatchArgs = Array(_len), _key = 0; _key < _len; _key++) {
          dispatchArgs[_key] = arguments[_key];
        }

        dispatchArgs.forEach(function (arg) {
          if (arg.type) {
            if (arg.type === PUSH) {
              batchDepth += 1;
            } else if (arg.type === POP) {
              batchDepth -= 1;
            } else {
              actionCount++;
            }
          }
        });

        var res = store.dispatch.apply(store, dispatchArgs);

        if (batchDepth === 0 && actionCount > 0) {
          actionCount = 0;
          notifyListenersBatched();
        }

        return res;
      }

      return _extends({}, store, {
        dispatch: dispatch,
        subscribe: subscribe,
        subscribeImmediate: subscribeImmediate
      });
    };
  };
}