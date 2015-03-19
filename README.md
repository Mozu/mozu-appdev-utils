# Mozu AppDev Utilities

A Node library that exposes some convenience methods for common operations on the AppDev API. A little higher-level than the base methods exposed on the [Mozu Node SDK](https://github.com/mozu/mozu-node-sdk), but still general and unopinionated. 

## Usage

A utility instance takes SDK context and a "working app" application key. Each instance can only work with one app at a time.

The context will need a **separate app key**, as will your workflow. Create an app in your developer account that you will use for the actual sync. That app needs all Developer and Developer Asset behaviors. You'll supply this app's key and shared secret as part of the context; the actual API calls will be made under this app's claims, even if they are updating the assets of another app.

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
appdev.preauthenticate().then(function() {
  return appdev.uploadFiles(['localfile.txt', 'localfile2.html'], { noclobber: true }, function(progress) {
    console.log(progress);
  });
}).then(function() {
  console.log('done!');
});

```

## Preauthentication

Several of the methods may launch multiple simultaneous requests. If these are the first requests you've run in the session, then all of these requests may try to acquire authentication at the same time, resulting in multiple simultaneous auth requests and a lot of slowness. To avoid this, call the `.preauthenticate` method before running any other calls, as in the example above. The overhead is minimal and will result in faster operations later.

## Methods

### `deleteAllFiles(options, progress)`
Delete all files in this package in Developer Center. 
##### Arguments
 - **options** *(Object)* An object of options to modify request behavior. There are no options for this method; this is here for forward compatibility.
 - **progress** *(Function)* A function that will be called once before and once after each file is deleted. Use for progress logging. When called before, it will send data in an object with a `before` property. When called after, it will send data in an object with an `after` property.

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
 - **progress** *(Function)* A function that will be called once before and once after each file is deleted. Use for progress logging. When called before, it will send data in an object with a `before` property. When called after, it will send data in an object with an `after` property.

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For deletes these are currently null.


### `preauthenticate()`
Run and memoize initial Developer Center call that acquires app and user claims for future requests.
##### Returns
 - *(Promise&lt;metadata&gt;)* A Promise for package metadata, a tree of directories and files.

Run this call before other calls. You can run it multiple times per session without running multiple requests; it only runs the request once and caches the claims.


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
 - **progress** *(Function)* A function that will be called once before and once after each file is renamed. Use for progress logging. When called before, it will send data in an object with a `before` property. When called after, it will send data in an object with an `after` property.

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For renames these are currently null.


### `uploadFile(filepath, options, body, mtime)`
Upload a file to this package in Developer Center.
##### Arguments
 - **filepath** *(String)* The path to a file to upload. This method assumes that the relative path to the file from your working directory will be the same as the intended path in Developer Center. If it should be different, then you can prevent reading from the filesystem by supplying a `body` argument.
 - **options** *(Object)* An object of options to modify the request behavior. Valid options currently are:
    - **noclobber** *(Boolean)* If this is set to `true`, then the uploads will include a last modified date from your local file system. If you attempt to upload a file that is older than the one in Developer Center, the upload will fail. If it is set to `false`, then all uploads will override regardless of modified date. *Default: `false`*
 - **body** *(String)* *Optional.* If you supply a `body` string, then it will use this value as the content of the file it uploads. The utility will bypass accessing the filesystem and instead just upload the provided content. If this argument is omitted, then the utility will upload the contents of the file specified in `filepath`.
 - **mtime** *(String)* If `options.noclobber` was specified, and the `body` argument was used, then you'll need to manually supply a last modified datetime. Supply it here as an ISO formatted string. If the `body` argument was not used, you can still use this to override the datetime read from the filesystem.

##### Returns
 - *(Promise&lt;info&gt;)* A Promise for an info object. For uploads, this object consists of a filename, ID, checksum, upload size, and path.


### `uploadFiles(filespecs, options, body, mtime)`
Upload multiple file to this package in Developer Center.
##### Arguments
 - **filespecs** *(String[] / Object[] )* An array of filespecs. A filespec for `uploadFiles` can either be a string path, or an object with a `path` property that is a string path. The spec object can optionally include an `options` object for that individual file.
 - **options** *(Object)* An object of options to modify request behavior. The options are the same as they are for `uploadFile`.
 - **progress** *(Function)* A function that will be called once before and once after each file is uploaded. Use for progress logging. When called before, it will send data in an object with a `before` property. When called after, it will send data in an object with an `after` property.

##### Returns
 - *(Promise&lt;info[]&gt;)* A Promise for an array of info objects. For uploads, this object consists of a filename, ID, checksum, upload size, and path. 