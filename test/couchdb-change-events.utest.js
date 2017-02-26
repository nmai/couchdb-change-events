const proxyquire = require('proxyquire').noCallThru(),
	sinon = require('sinon'),
	should = require('should');

describe('CouchdbChangeEvents', () => {
	let CouchdbChangeEvents,
		proxy;

	beforeEach(() => {
		proxy = {};

		global.setTimeout = sinon.spy();

		CouchdbChangeEvents = proxyquire('../src/couchdb-change-events', proxy);
	});

	describe('.constructor()', () => {
		let changeEvents;

		beforeEach(() => {
			CouchdbChangeEvents.prototype.connect = sinon.spy();
			CouchdbChangeEvents.prototype.checkHeartbeat = sinon.spy();
			CouchdbChangeEvents.prototype.setCouchdbStatus = sinon.spy();

			changeEvents = new CouchdbChangeEvents({
				db: 'my_database'
			});
		});

		it('exposes COUCHDB_STATUS_CONNECTED constant', () => {
			should.equal(changeEvents.COUCHDB_STATUS_CONNECTED, 'connected');
		});

		it('exposes COUCHDB_STATUS_DISCONNECTED constant', () => {
			should.equal(
				changeEvents.COUCHDB_STATUS_DISCONNECTED, 'disconnected'
			);
		});

		it('has default value for config "host": localhost', () => {
			should.equal(changeEvents.host, 'localhost');
		});

		it('has default value for config "port": 5984', () => {
			should.equal(changeEvents.port, 5984);
		});

		it('has default value for config "protocol": http', () => {
			should.equal(changeEvents.protocol, 'http');
		});

		it('has default value for config "heartbeat": 2000', () => {
			should.equal(changeEvents.heartbeat, 2000);
		});

		it('uses parameter "db" from provided config', () => {
			should.equal(changeEvents.db, 'my_database');
		});

		it('uses parameter "lastEventId" from provided config', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				lastEventId: '127-eb534549c61b48f28c753ea95c64f02b'
			});

			should.equal(
				changeEvents.lastEventId,
				'127-eb534549c61b48f28c753ea95c64f02b'
			);
		});

		it('uses custom config parameter "host" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				host: '127.0.0.1'
			});

			should.equal(changeEvents.host, '127.0.0.1');
		});

		it('uses custom config parameter "port" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				port: 3000
			});

			should.equal(changeEvents.port, 3000);
		});

		it('uses custom config parameter "protocol" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				protocol: 'https'
			});

			should.equal(changeEvents.protocol, 'https');
		});

		it('uses custom config parameter "heartbeat" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				heartbeat: 4000
			});

			should.equal(changeEvents.heartbeat, 4000);
		});

		it('uses custom config parameter "includeDocs" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				includeDocs: false
			});

			should.equal(changeEvents.includeDocs, false);
		});

		it('throws an error, if db is not provided ', () => {
			try {
				new CouchdbChangeEvents({});
			} catch (error) {
				should.equal(error.message, 'db parameter missing from config');
				should.equal(error.error_type, 'EMPTY_DB_PARAMETER');
			}
		});

		it('sets last heartbeats time to current time', () => {
			const timeDelta = new Date().getTime() - changeEvents.lastHeartBeat;

			should.equal(timeDelta < 5, true);
			should.equal(timeDelta >= 0, true);
		});

		it('sets couchdb connection status to disconnected', () => {
			should.equal(
				changeEvents.setCouchdbStatus.firstCall.args[0],
				'disconnected'
			);
		});

		it('initializes heartbeat check loop', () => {
			should.equal(changeEvents.checkHeartbeat.callCount, 1);
		});

		it('tries to connect to couchdb changes', () => {
			should.equal(changeEvents.connect.callCount, 1);
		});
	});

	describe('.checkHeartbeat()', () => {
		let changeEvents;

		beforeEach(() => {
			CouchdbChangeEvents.prototype.connect = sinon.spy();

			changeEvents = new CouchdbChangeEvents({
				db: 'my_database'
			});

			global.setTimeout.reset();
		});

		it('checks heartbeat after every second', () => {
			changeEvents.checkHeartbeat();

			should.equal(
				global.setTimeout.firstCall.args[0].name,
				'bound checkHeartbeat'
			);

			should.equal(global.setTimeout.firstCall.args[1], 1000);
		});

		it('kills http connection, if there has not been heartbeat for atleast 10s', () => {
			changeEvents.lastHeartBeat = new Date().getTime() - 11000;

			changeEvents.couchDbConnection = {
				destroy: sinon.spy()
			};

			changeEvents.checkHeartbeat();

			should.equal(changeEvents.couchDbConnection.destroy.callCount, 1);
		});

		it('does nothing when connection does not exist and heartbeat time is exceeded', () => {
			changeEvents.lastHeartBeat = new Date().getTime() - 11000;
			changeEvents.checkHeartbeat();

			should.equal(changeEvents.couchDbConnection, null);
		});
	});
});