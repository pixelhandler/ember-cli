'use strict';

var Blueprint   = require('../../../lib/models/blueprint');
var MockProject = require('../../helpers/mock-project');
var expect      = require('chai').expect;
var proxyquire  = require('proxyquire');
var fs          = require('fs');
var path        = require('path');

describe('blueprint - addon', function() {
  describe('Blueprint.lookup', function() {
    var blueprint;

    beforeEach(function() {
      blueprint = Blueprint.lookup('addon');
    });

    describe('entityName', function() {
      var mockProject;

      beforeEach(function() {
        mockProject = new MockProject();
        mockProject.isEmberCLIProject = function() { return true; };

        blueprint.project = mockProject;
      });

      afterEach(function() {
        mockProject = null;
      });

      it('throws error when current project is an existing ember-cli project', function() {
        expect(function() {
          blueprint.normalizeEntityName('foo');
        }).to.throw('Generating an addon in an existing ember-cli project is not supported.');
      });

      it('works when current project is an existing ember-cli addon', function() {
        mockProject.isEmberCLIAddon = function() { return true; };

        expect(function() {
          blueprint.normalizeEntityName('foo');
        }).not.to.throw('Generating an addon in an existing ember-cli project is not supported.');
      });

      it('keeps existing behavior by calling Blueprint.normalizeEntityName', function() {
        expect(function() {
          var nonConformantComponentName = 'foo/';
          blueprint.normalizeEntityName(nonConformantComponentName);
        }).to.throw(/trailing slash/);
      });
    });
  });

  describe('direct blueprint require', function() {
    var blueprint;
    var readJsonSyncStub;
    var readJsonSyncWasCalled;
    var readJsonSyncArguments;
    var readJsonSyncReturnValue;
    var writeFileSyncStub;
    var writeFileSyncWasCalled;
    var writeFileSyncArguments;

    beforeEach(function() {
      blueprint = proxyquire('../../../blueprints/addon', {
        'fs-extra': {
          readJsonSync: function() {
            return readJsonSyncStub.apply(this, arguments);
          },
          writeFileSync: function() {
            return writeFileSyncStub.apply(this, arguments);
          }
        }
      });
      blueprint._appBlueprint = {
        path: 'test-app-blueprint-path'
      };
      blueprint.project = {
        name: function() {
          return 'test-project-name';
        }
      };
      blueprint.path = 'test-blueprint-path';

      readJsonSyncWasCalled = false;
      readJsonSyncArguments = [];
      readJsonSyncReturnValue = {};
      readJsonSyncStub = function() {
        readJsonSyncWasCalled = true;
        readJsonSyncArguments = arguments;
        return readJsonSyncReturnValue;
      };

      writeFileSyncWasCalled = false;
      writeFileSyncArguments = [];
      writeFileSyncStub = function() {
        writeFileSyncWasCalled = true;
        writeFileSyncArguments = arguments;
      };
    });

    describe('generatePackageJson', function() {
      it('works', function() {
        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        expect(readJsonSyncArguments[0]).to.equal(path.normalize('test-app-blueprint-path/files/package.json'));
        expect(writeFileSyncArguments[0]).to.equal(path.normalize('test-blueprint-path/files/package.json'));

        // string to test ordering
        expect(writeFileSyncArguments[1]).to.deep.equal('\
{\n\
  "name": "test-project-name",\n\
  "description": "The default blueprint for ember-cli addons.",\n\
  "scripts": {\n\
    "test": "ember try:each"\n\
  },\n\
  "keywords": [\n\
    "ember-addon"\n\
  ],\n\
  "dependencies": {},\n\
  "devDependencies": {\n\
    "ember-disable-prototype-extensions": "^1.1.0"\n\
  },\n\
  "ember-addon": {\n\
    "configPath": "tests/dummy/config"\n\
  }\n\
}\n');
      });

      it('removes the `private` property', function() {
        readJsonSyncReturnValue = {
          private: true
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.private).to.be.undefined;
      });

      it('overwrites `name`', function() {
        readJsonSyncReturnValue = {
          name: 'test-name'
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.name).to.equal('test-project-name');
      });

      it('overwrites `description`', function() {
        readJsonSyncReturnValue = {
          description: 'test-description'
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.description).to.equal('The default blueprint for ember-cli addons.');
      });

      it('moves `ember-cli-babel` from devDependencies to dependencies', function() {
        readJsonSyncReturnValue = {
          devDependencies: {
            'ember-cli-babel': '1.0.0'
          }
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.dependencies).to.deep.equal({
          'ember-cli-babel': '1.0.0'
        });
        expect(json.devDependencies).to.not.have.property('ember-cli-babel');
      });

      it('does not push multiple `ember-addon` keywords', function() {
        readJsonSyncReturnValue = {
          keywords: ['ember-addon']
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.keywords).to.deep.equal(['ember-addon']);
      });

      it('overwrites any version of `ember-disable-prototype-extensions`', function() {
        readJsonSyncReturnValue = {
          devDependencies: {
            'ember-disable-prototype-extensions': '0.0.1'
          }
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.devDependencies['ember-disable-prototype-extensions']).to.equal('^1.1.0');
      });

      it('overwrites `scripts.test`', function() {
        readJsonSyncReturnValue = {
          scripts: {
            test: 'test-string'
          }
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json.scripts.test).to.equal('ember try:each');
      });

      it('overwrites `ember-addon.configPath`', function() {
        readJsonSyncReturnValue = {
          'ember-addon': {
            configPath: 'test-path'
          }
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        expect(json['ember-addon'].configPath).to.equal('tests/dummy/config');
      });

      it('preserves dependency ordering', function() {
        readJsonSyncReturnValue = {
          dependencies: {
            b: '1',
            a: '1'
          },
          devDependencies: {
            b: '1',
            a: '1'
          }
        };

        blueprint.generatePackageJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        var json = JSON.parse(writeFileSyncArguments[1]);
        delete json.devDependencies['ember-disable-prototype-extensions'];
        expect(json.dependencies).to.deep.equal({ a: "1", b: "1" });
        expect(json.devDependencies).to.deep.equal({ a: "1", b: "1" });
      });

      it('appends ending newline', function() {
        blueprint.generatePackageJson();

        expect(writeFileSyncWasCalled).to.be.true;

        var contents = writeFileSyncArguments[1];
        expect(contents[contents.length - 1]).to.equal('\n');
      });
    });

    describe('generateBowerJson', function() {
      it('works', function() {
        blueprint.generateBowerJson();

        expect(readJsonSyncWasCalled).to.be.true;
        expect(writeFileSyncWasCalled).to.be.true;

        expect(readJsonSyncArguments[0]).to.equal(path.normalize('test-app-blueprint-path/files/bower.json'));
        expect(writeFileSyncArguments[0]).to.equal(path.normalize('test-blueprint-path/files/bower.json'));

        // string to test ordering
        expect(writeFileSyncArguments[1]).to.deep.equal('\
{\n\
  "name": "test-project-name"\n\
}\n');
      });

      it('appends ending newline', function() {
        blueprint.generateBowerJson();

        expect(writeFileSyncWasCalled).to.be.true;

        var contents = writeFileSyncArguments[1];
        expect(contents[contents.length - 1]).to.equal('\n');
      });
    });
  });
});
