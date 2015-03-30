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

function ProgressEvent(phase, type, file, reason) {
  this.phase = phase;
  this.type = type;
  this.file = file;
  if (this.file && this.file.path) this.file.path = path.normalize(this.file.path);
  this.reason = reason || '';
}

ProgressEvent.prototype.toJSON = function() {
  return {
    type: this.type,
    file: this.file,
    reason: this.reason
  };
};

function createProgressLogger(callback) {
  if (!callback) return identity;
  return function(phase, type, file, reason) {
    return callback(new ProgressEvent(phase, type, file, reason));
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