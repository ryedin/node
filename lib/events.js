//override whatever constructor is already defined
var _ctor = process.EventEmitter;
var _proto = process.EventEmitter.prototype;
process.EventEmitter = function(config) {
    _ctor.apply(this); //the original constructor expects no args so it should be safe to not pass along the arguments array
    
    //augment
    this._suppressOnceEvents = {}; //events to NOT fire 1x
    this._suppressEvents = {}; //events to NOT fire until unsuppress gets called on that event
    //allow wiring events via the constructor
    if (config && (config.on || config.once)) {
        if (config.on) {
            for (var evt in config.on) {
                this.on(evt, config.on[evt]);
            }
        }                
        if (config.once) {
            for (var evt2 in config.once) {
                this.once(evt2, config.once[evt2]);
            }
        }
    }
};
process.EventEmitter.prototype = _proto;

exports.EventEmitter = process.EventEmitter;

process.EventEmitter.prototype.emit = process.EventEmitter.prototype.fire = function (type) {
  // putting this here will allow the 'error' event to be suppressed, which I suppose could be 
  // useful/valid for certain debugging scenarios. If deemed evil to do that, we can simply move this check
  // to be after the 'error' bit
  if((this._suppressOnceEvents && this._suppressOnceEvents[type]) || 
     (this._suppressEvents && this._suppressEvents[type])) {
    delete this._suppressOnceEvents[type]; //assures this event will fire next time around
    return false;
  }
  
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (this._events.error instanceof Array && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1];
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  if (!this._events[type]) return false;

  if (typeof this._events[type] == 'function') {
    if (arguments.length < 3) {
      // fast case
      this._events[type].call( this
                             , arguments[1]
                             , arguments[2]
                             );
    } else {
      // slower
      var args = Array.prototype.slice.call(arguments, 1);
      this._events[type].apply(this, args);
    }
    //get rid of the listener if it's marked to only execute one time
    if (this._events[type].__once) this.removeListener(type, this._events[type]);
    return true;

  } else if (this._events[type] instanceof Array) {
    var args = Array.prototype.slice.call(arguments, 1);

    //placeholder in case we need to get rid of 'once' handlers (avoid creating the array if it's never needed)
    //(don't want to remove them within the loop so-as not to muck with the indices)
    var oneShotListeners;

    var listeners = this._events[type].slice(0);
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
      if (listeners[i].__once) {
          oneShotListeners = oneShotListeners || []; //not sure if re-assigning to self is overhead or if memoization will prevail - code reviewer please advise if you know
          oneShotListeners.push(listeners[i]);
      }
    }
    //get rid of any one-timers
    if (oneShotListeners) {
        for (var ii = 0, ll = oneShotListeners.length; ii < ll; ii++) {
            this.removeListener(type, oneShotListeners[ii]);
        }
    }
    return true;

  } else {
    return false;
  }
};

// process.EventEmitter is defined in src/node_events.cc
// process.EventEmitter.prototype.emit() is also defined there.
process.EventEmitter.prototype.addListener = process.EventEmitter.prototype.on = function (type, listener, once) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};
  
  //attach listener metadata to indicate if it should only execute one time or every time
  if (once === true) listener.__once = once; //add underscores to defend against super-edge case of listener already have a .once property

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit("newListener", type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (this._events[type] instanceof Array) {
    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

//convenience method for attaching one-shot listeners
process.EventEmitter.prototype.once = function(type, listener) {
    return this.on(type, listener, true);
};


process.EventEmitter.prototype.removeListener = function (type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (list instanceof Array) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
  } else if (this._events[type] === listener) {
    this._events[type] = null;
  }

  return this;
};

process.EventEmitter.prototype.removeAllListeners = function (type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

process.EventEmitter.prototype.listeners = function (type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!(this._events[type] instanceof Array)) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};
exports.Promise = function removed () {
  throw new Error(
    'Promise has been removed. See '+
    'http://groups.google.com/group/nodejs/msg/0c483b891c56fea2 for more information.');
};
process.Promise = exports.Promise;

//allow events to be suppressed / unsuppressed
process.EventEmitter.prototype.suppress = function(type) {
    this._suppressEvents[type] = true;
};
process.EventEmitter.prototype.suppressOnce = function(type) {
    this._suppressOnceEvents[type] = true;
};
process.EventEmitter.prototype.unsuppress = function(type) {
    delete this._suppressEvents[type];
    delete this._suppressOnceEvents[type];
};