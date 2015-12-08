var when = require('when');
var whenGuard = require('when/guard');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var PH = require('./progress-handlers');

var DEV = "DEVELOPER";
var PATHSEP = "|";
var CURRENT = "./";

function formatPath(pathstring, sep) {
  return path.join(CURRENT, pathstring).split(path.sep).join(sep || PATHSEP);
}

function isLastModifiedError(err) {
  var message = err && (err.message || err.originalError && err.originalError.message);
  return typeof message === "string" && (message.indexOf('Validation Error: LastModifedTime') === 0);
}

function aggregate(conf) {
  return function(filespecs, options, progressCallback) {
    var progress = PH.createLogger(progressCallback);
    var complete = PH.createCompleteHandler(progress);
    var step = conf.step(options, progress, complete).bind(this);
    var preprocess = conf.preprocess ? conf.preprocess(filespecs, options, progress).bind(this) : function() { return filespecs; };
    return this.getMetadata(filespecs)
    .then(preprocess).then(function(filespecs) {
      return when.all(filespecs.map(whenGuard(whenGuard.n(process.env.MOZU_APPDEV_UTILS_CONCURRENCY || 16), step)));
    });
  }
}

function createClient(context, config) {
  config.context = context;
  config.plugins = config.plugins || [];
  config.plugins.push(require('mozu-node-sdk/plugins/fiddler-proxy'));
  config.defaultRequestOptions = {
    timeout: process.env.MOZU_APPDEV_UTILS_TIMEOUT_SECONDS ? Number(process.env.MOZU_APPDEV_UTILS_TIMEOUT_SECONDS) * 1000 : 60000
  };
  return require('mozu-node-sdk/clients/platform/application')(config);
}

function metadataTreeToArray(trees) {
  return trees.reduce(function(files, tree) {
    return files.concat(tree.files).concat(tree.subFolders.length === 0 ? [] : metadataTreeToArray(tree.subFolders));
  }, []);
}

// legacy methods to ensure synchronousness
function getChecksum(fileText) {
  var hash = crypto.createHash('md5');
  hash.update(fileText);
  return hash.digest('hex');
}

var methods = {
  getMetadata: function(filespecs) {
    var self = this;
    var concurrencyLimit = process.env.MOZU_APPDEV_UTILS_CONCURRENCY || 16;
    if (filespecs && filespecs.length < concurrencyLimit) {
      return Promise.all(
        filespecs.map(function(spec) {
          return self.client.getPackageFileMetadata({
            applicationKey: self.appKey,
            filepath: spec.path || spec
          }, { scope: DEV }).catch(function(notFound) {
            // not found is ok
            return null;
          });
        })
      ).then(function(metadata) {
        return metadata.filter(function(exists) { return !!exists; });
      });
    } else {
      return self.client.getPackageMetadata({
        applicationKey: self.appKey
      }, { scope: DEV }).then(function(res) {
        return metadataTreeToArray([res]);
      });
    }
  },
  uploadFile: function(filepath, options, body, mtime) {
    if (body && typeof body === "string") {
      body = new Buffer(body, 'utf8');
    }
    var config = {
      applicationKey: this.appKey,
      filepath: formatPath(filepath)
    };
    if (options.noclobber) {
      config.lastModifiedTime = mtime || fs.statSync(filepath).mtime.toISOString();
    }
    return this.client.upsertPackageFile(config, {
      scope: DEV,
      body: body || fs.readFileSync(filepath)
    });
  },
  uploadFiles: aggregate({
    step: function(options, progress, complete) {
      return function(spec) {
        progress(PH.EventPhases.BEFORE, PH.EventTypes.BEFORE_UPLOAD, spec);
        var operation = this.uploadFile(spec.path || spec, spec.options || options, spec.body, spec.mtime).then(complete);
        if (options.noclobber) {
          return operation.catch(function(err) {
            if (isLastModifiedError(err)) {
              progress(PH.EventPhases.BEFORE, PH.EventTypes.REJECTED, {
                path: spec.path || spec,
                sizeInBytes: 0,
                type: ''
              }, 'Developer Center has a newer copy. Set the option `noclobber` to false to override.');
              return err;
            } else {
              throw err;
            }
          });
        } else {
          return operation;
        }
      }
    },
    preprocess: function(filespecs, options, progress) {

      function onlyModified(filespecs) {
        var pathToChecksum = filespecs.reduce(function(memo, filespec) {
          memo[path.normalize(filespec.path)] = filespec.checkSum;
          return memo;
        }, {});
        return function(modifiedFiles, filespec) {
          var p = filespec.path || filespec;
          var fileContents = fs.readFileSync(p);
          var isSame = pathToChecksum[path.normalize(p)] === getChecksum(fileContents);
          if (isSame) {
            progress(PH.EventPhases.BEFORE, PH.EventTypes.OMITTED, filespec, 'Developer Center has an identical file. Set the option `ignoreChecksum` to true to override.');
          } else {
            // we've already read this file from the file system, so let's
            // pass the contents to uploadFile
            filespec.body = fileContents;
            filespec.mtime = fs.statSync(p).mtime.toISOString();
            modifiedFiles.push(filespec);
          }
          return modifiedFiles;
        }
      }

      return function(metadata) {
        progress(PH.EventPhases.BEFORE, PH.EventTypes.PREPROCESS, metadata);
        return options.ignoreChecksum ? filespecs : filespecs.reduce(onlyModified(metadata), []);  
      };

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
  deleteFiles: aggregate({
    step: function(options, progress, complete) {
      return function(spec) {
        progress(PH.EventPhases.BEFORE, PH.EventTypes.BEFORE_DELETE, spec);
        return this.deleteFile(spec.path || spec).then(complete);
      }
    },
    preprocess: function(filespecs, options, progress) {
      return function(metadata) {
        var files = filespecs.reduce(function(memo, filespec) {
          memo[path.normalize(filespec.path || filespec)] = filespec;
          return memo;
        }, {});
        return filespecs.filter(function(spec) {
          var exists = !!files[path.normalize(spec.path || spec)]
          if (!exists) {
            progress(PH.EventPhases.BEFORE, PH.EventTypes.OMITTED, spec, "the file does not exist in Developer Center and therefore cannot be deleted.");
          }
          return exists;
        });
      }
    }
  }),
  deleteAllFiles: function(options, progress) {
    return this.getMetadata()
    .then(function(filespecs) {
      return this.deleteFiles(filespecs, options, progress);
    }.bind(this));
  },
  renameFile: function(filepath, destpath, options) {
    return this.client.renamePackageFile({
      applicationKey: this.appKey,
      oldFullPath: formatPath(filepath),
      newFullPath: formatPath(destpath)
    }, {
      scope: DEV
    }).then(function(r) {
      return {
        oldPath: formatPath(filepath, '/'),
        newPath: r.path
      }
    });
  },
  renameFiles: aggregate({
    step: function(options, progress, complete) {
      return function(spec) {
        progress(PH.EventPhases.BEFORE, PH.EventTypes.BEFORE_RENAME, spec);
        return this.renameFile(spec.oldFullPath, spec.newFullPath, options).then(complete);
      }
    }
  })
}

module.exports = function(appKey, context, extraConfig) {
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
      value: createClient(context, extraConfig || {})
    }
  });
};
