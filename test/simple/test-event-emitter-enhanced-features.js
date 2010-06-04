require("../common");
var events = require('events');

var t = 0;
var t2 = 0;

//test wiring via constructor config ----
//(note: this should also give coverage for the .on alias for .addListener)
var e = new events.EventEmitter({
    on: {
        test: function() {
            t++;
        }
    },
    once: {
        test: function() {
            t2++;
        }
    }
});
e.emit("test");
assert.equal(1, t);
assert.equal(1, t2);

e.emit("test");
assert.equal(2, t);
assert.equal(1, t2);

//test event suppression ----
e.suppress("test");
e.emit("test");
assert.equal(2, t);
assert.equal(1, t2);
e.emit("test");
assert.equal(2, t);
assert.equal(1, t2);

//test unsupression ----
e.unsuppress("test");
e.emit("test");
assert.equal(3, t);
assert.equal(1, t2);

//test suppressOnce ----
e.suppressOnce("test");
e.emit("test");
assert.equal(3, t);
assert.equal(1, t2);
e.emit("test");
assert.equal(4, t);
assert.equal(1, t2);

//test .fire alias for .emit
e.fire("test");
assert.equal(5, t);