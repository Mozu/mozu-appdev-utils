var SDK = require('mozu-node-sdk');
var when = require('when');
var fs = require('fs');
var path = require('path');

var DEV = "DEVELOPER";
var PATHSEP = "|";
var CURRENT = "./";

function formatPath(pathstring, sep) {
  return path.join(CURRENT, pathstring).split(path.sep).join(sep || PATHSEP);
}

function createProgressLogger(callback) {
  if (!callback) return function() {};
  return function(r, options) {
    options = options || {};
    var payload = options.before ? {
      before: r
    } : {
      after: r
    };
    callback(payload);
    return r;
  };
}

function createAggregator(createStep) {
  return function(filespecs, options, progressCallback) {
    var progress = createProgressLogger(progressCallback)
    var step = createStep(filespecs, options, progress).bind(this);
    return when.all(filespecs.map(step));
  }
}

function createClient(context) {
  var c = SDK.client(context);
  if (process.env.USE_FIDDLER) {
    c.defaultRequestOptions = {
      proxy: 'http://127.0.0.1:8888',
      rejectUnauthorized: false
    };
  }
  return c.platform().application();
}

function walkMetadataTrees(trees) {
  return trees.reduce(function(files, tree) {
    return files.concat(tree.files).concat(tree.subFolders.length === 0 ? [] : walkMetadataTrees(tree.subFolders));
  }, []);
}

var methods = {
  uploadFile: function(filepath, options, body, mtime) {
    return this.client.upsertPackageFile({
      applicationKey: this.appKey,
      lastModifiedTime: options.noclobber && (mtime || fs.statSync(filepath).mtime.toISOString()),
      filepath: formatPath(filepath)
    }, {
      scope: DEV,
      body: body || fs.readFileSync(filepath, 'utf8')
    });
  },
  uploadFiles: createAggregator(function(filespecs, options, progress) {
    return function(spec) {
      progress(spec, {
        before: true
      });
      return this.uploadFile(spec.path || spec, spec.options || options, spec.body, spec.mtime).then(progress);
    }
  }),
  deleteFile: function(filepath) {
    return this.client.deletePackageFile({
      applicationKey: this.appKey,
      filepath: formatPath(filepath)
    }, {
      scope: DEV
    }).then(function(r) {
      return {
        path: filepath
      };
    })
  },
  deleteFiles: createAggregator(function(filespecs, options, progress) {
    return function(spec) {
      progress(spec, {
        before: true
      });
      return this.deleteFile(spec.path || spec).then(progress);
    }
  }),
  deleteAllFiles: function(options, progress) {
    return this.client.getPackageMetadata({
      applicationKey: this.appKey
    }, {
      scope: DEV
    }).then(function(metadata) {
      return this.deleteFiles(walkMetadataTrees([metadata]), options, progress);
    }.bind(this));
  },
  renameFile: function(filepath, destpath, options) {
    var config = {
      applicationKey: this.appKey,
      oldFullPath: formatPath(filepath),
      newFullPath: formatPath(destpath)
    };
    return this.client.renamePackageFile(config, {
      scope: DEV
    }).then(function(r) {
      return {
        oldPath: formatPath(filepath, '/'),
        newPath: r.path
      }
    });
  },
  renameFiles: createAggregator(function(filespecs, options, progress) {
    return function(spec) {
      progress(spec, {
        before: true
      });
      return this.renameFile(spec.oldFullPath, spec.newFullPath, options).then(progress);
    }
  }),
  preauthenticate: function() {
    if (this._metadata) {
      return when(this._metadata);
    }
    return this.client.getPackageMetadata({
      applicationKey: this.appKey
    }, {
      scope: DEV
    }).then(function(metadata) {
      this._metadata = metadata;
      return metadata;
    }.bind(this));
  }
}

module.exports = function(appKey, context) {
  return Object.create(methods, {
    appKey: {
      enumerable: true,
      configurable: false,
      writable: false,
      value: appKey,
    },
    client: {
      enumerable: true,
      configurable: true,
      writable: true,
      value: createClient(context)
    }
  });
};