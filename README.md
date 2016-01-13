# Mozu AppDev Utilities

## This package is currently a prerelease.
**This contains pre-release code. It may have behaviors or rely on features that don't work in Mozu production environments. Use with caution!**

A Node library that exposes some convenience methods for common operations on the AppDev API. A little higher-level than the base methods exposed on the [Mozu Node SDK](https://github.com/mozu/mozu-node-sdk), but still general and unopinionated. Mostly, this helps to organize and scale a large number of file sync operations.

## Usage

### `appDevUtils(appKey, sdkContext, [sdkPlugins])`

A utility instance requires a "working app" application key and an SDK context object. Each instance can only work with one app at a time. The SDK context object can be omitted if the working directory contains a `mozu.config.json` file that can supply the context. The utility instance will connect to the Mozu API using the Mozu Node SDK, initialized with the supplied context.

Optionally, you may supply a third argument consisting of Mozu Node SDK plugins, much like the second argument to the Node SDK `.client()` factory.

```js
var appDevUtils = require('mozu-appdev-utils');

var appdev = appDevUtils('ecea159.example-app.1.0.0.release', {
  appKey: "ecea159.developeraccess.1.0.0.release",
  sharedSecret: "977e6eba536e448db04d32cfbeddbbe7",
  // change this to access other Mozu environments
  baseUrl: "https://home.mozu.com",
  // find your developer account ID by looking at
  // the link target of your Developer Account link
  // in the Mozu Launchpad
  developerAccountId: "1075",
  developerAccount: {
    emailAddress: "james_zetlen@volusion.com",
    password: "FakePassword"
  }
});

// ready for use
appdev.uploadFiles(['localfile.txt', 'localfile2.html'], { noclobber: true }, function(progress) {
  console.log(progress);
}).then(function() {
  console.log('done!');
});

```

## Methods

### `deleteAllFiles(options, progress)`
Delete all files in this package in Developer Center. 
##### Arguments
 - **options** *(Object)* An object of options to modify request behavior. There are no options for this method; this is here for forward compatibility.
 - **progress** *(Function)* A function that will be called with [Progress Events](#progress-events).

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For deletes these are currently null.

Works by running a getPackageMetadata request to get all files, then deleting each one.


### `deleteFile(filepath)`
Delete a file in this package in Developer Center. 
##### Arguments
 - **filepath** *(String)* Path to the file to delete. Must be relative to the root of the application, e.g. `'assets/dist/app.js'`. May use either Windows or UNIX path separators.

##### Returns
 - *(Promise&lt;info&gt;)* A Promise for an info object. For deletes these are currently null.


### `deleteFiles(filespecs, options, progress)`
Delete multiple files in this package in Developer Center. 
##### Arguments
 - **filespecs** *(String[] / Object[] )* An array of filespecs. A filespec for `deleteFiles` can either be a string path, or an object with a `path` property that is a string path.
 - **options** *(Object)* An object of options to modify request behavior. There are no options for this method; this is here for forward compatibility.
 - **progress** *(Function)* A function that will be called with [Progress Events](#progress-events).

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For deletes these are currently null.


### `renameFile(filepath, destpath, options)`
Rename a file in this package in Developer Center. 
##### Arguments
 - **filepath** *(String)* Path to the file to rename. Must be relative to the root of the application, e.g. `'assets/dist/app.js'`. May use either Windows or UNIX path separators.
 - **destpath** *(String)* The new name. Must be relative to the root of the application, e.g. `'assets/dist/app-new.js'`. May use either Windows or UNIX path separators.
 - **options** *(Object)* An object of options to modify request behavior. There are no options for this method; this is here for forward compatibility.

##### Returns
 - *(Promise&lt;info&gt;)* A Promise for an info object. For renames these are currently null.


### `renameFiles(filespecs, options, progress)`
Rename multiple files in this package in Developer Center. 
##### Arguments
 - **filespecs** *(Object[])* An array of filespecs. A filespec for `renameFiles` must be an object with an `oldFullPath` property that is a string path, and a `newFullPath` property that is a string path.
 - **options** *(Object)* An object of options to modify request behavior. The options are the same as they are for `renameFile`.
 - **progress** *(Function)* A function that will be called with [Progress Events](#progress-events).

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For renames these are currently null.


### `uploadFile(filepath, options, body, mtime)`
Upload a file to this package in Developer Center.
##### Arguments
 - **filepath** *(String)* The path to a file to upload. This method assumes that the relative path to the file from your working directory will be the same as the intended path in Developer Center. If it should be different, then you can prevent reading from the filesystem by supplying a `body` argument.
 - **options** *(Object)* An object of options to modify the request behavior. Valid options currently are:
    - **noclobber** *(Boolean)* If this is set to `true`, then the uploads will include a last modified date from your local file system. If you attempt to upload a file that is older than the one in Developer Center, the upload will fail. If it is set to `false`, then all uploads will override regardless of modified date. *Default: `false`*
 - **body** *(String/Buffer)* *Optional.* If you supply a `body` string, then it will use this value as the content of the file it uploads. The utility will bypass accessing the filesystem and instead just upload the provided content. If this argument is omitted, then the utility will upload the contents of the file specified in `filepath`.
 - **mtime** *(String)* If `options.noclobber` was specified, and the `body` argument was used, then you'll need to manually supply a last modified datetime. Supply it here as an ISO formatted string. If the `body` argument was not used, you can still use this to override the datetime read from the filesystem.

##### Returns
 - *(Promise&lt;info&gt;)* A Promise for an info object. For uploads, this object consists of a filename, ID, checksum, upload size, and path.


### `uploadFiles(filespecs, options, body, mtime)`
Upload multiple file to this package in Developer Center.
##### Arguments
 - **filespecs** *(String[] / Object[] )* An array of filespecs. A filespec for `uploadFiles` can either be a string path, or an object with a `path` property that is a string path. The spec object can optionally include an `options` object for that individual file.
 - **options** *(Object)* An object of options to modify request behavior. Valid options currently are:
    - **noclobber** *(Boolean)* If this is set to `true`, then the uploads will include a last modified date from your local file system. If you attempt to upload a file that is older than the one in Developer Center, the upload will fail. If it is set to `false`, then all uploads will override regardless of modified date. *Default: `false`*
    - **ignoreChecksum** *(Boolean)* By default, this method will use checksums to determine if the local file and the remote file are identical, and will skip the upload if they are. Set this to `true` to override this behavior.
 - **progress** *(Function)* A function that will be called with [Progress Events](#progress-events).

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For uploads, this object consists of a filename, ID, checksum, upload size, and path.

### Progress Events

The App Dev Utils asynchronous methods return [Promises](http://know.cujojs.com/tutorials/async/simplifying-async-with-promises), which are useful and composable abstractions, but since Promises can only be in one of three states *(pending, resolved, rejected)*, there is no standard way to handle progress notifications for a Promise. The [when.js](https://github.com/cujojs/when) library that underlies App Dev Utils and Mozu Node SDK promises has implemented, and later deprecated, a [progress events system](https://github.com/cujojs/when/blob/master/docs/api.md#promiseprogress). Since it is deprecated, we don't use it. Instead, our utils methods that are aggregating many operations under the hood (like `uploadFiles`, `deleteFiles`, `deleteAllFiles`, `renameFiles`) take an extra argument: a function that will be periodically called with Progress Events.

#### Progress Events API

A Progress Event is a JavaScript object that describes an event in the app dev sync process.

 - `phase` *(String)*
   A string representing the phase of the process during which the event fired. There are two phases: `'before'`, indicating an event that happened before an API call was made, and `'after'`, indicating an event that happened after a call was made, or that indicates the completion of the API call.
 - `type` *(String)*
   A string representing the type of event that took place. There are currently six:
    - `'preprocess'`: The inputs have been processed and validated and the calls    are about to begin
    - `'omitted'`: During preprocessing, a file was omitted from the list of files    to make an API call for.
    - `'rejected'`: The App Dev API rejected the operation. This may not be an    error (which rejects the Promise, rather than firing a Progress Event). It may    instead be normal validation.
    - `'completed'`: The App Dev API accepted an API call and responded with a    success message. The operation is complete.
    - `'beforeupload'`: The util is about to make an App Dev API call to upload a    file.
    - `'beforedelete'`: The util is about to make an App Dev API call to delete a file.
 - `data` *(Object)*
   An object describing the file or data that the Progress Event concerns. This object may have different properties depending on the type of event, so inspect it before making assumptions about it.
 - `reason` *(String)*
   If applicable, the `reason` will be a string describing why the event occurred. Some events, like `completed`, have an empty string for the reason, since there is no additional explanation required.
