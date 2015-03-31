var path = require('path');

var EventPhases = {
  AFTER: 'after',
  BEFORE: 'before'
};

var EventTypes = {
  PREPROCESS: 'preprocess',
  OMITTED: 'omitted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  BEFORE_UPLOAD: 'beforeupload',
  BEFORE_DELETE: 'beforedelete'
}

function identity(x) { return x; }

function ProgressEvent(phase, type, data, reason) {
  this.phase = phase;
  this.type = type;
  this.data = data;
  if (this.data && this.data.path) this.data.path = path.normalize(this.data.path);
  this.reason = reason || '';
}

ProgressEvent.prototype.toJSON = function() {
  return {
    type: this.type,
    data: this.data,
    reason: this.reason
  };
};

function createProgressLogger(callback) {
  if (!callback) return identity;
  return function(phase, type, data, reason) {
    return callback(new ProgressEvent(phase, type, data, reason));
  }
}

function createCompleteHandler(progress) {
  if (!progress) return identity;
  return function(r) {
    return progress(EventPhases.AFTER, EventTypes.COMPLETED, r);
  }
}

module.exports = {
  EventTypes: EventTypes,
  EventPhases: EventPhases,
  createLogger: createProgressLogger,
  createCompleteHandler: createCompleteHandler
}